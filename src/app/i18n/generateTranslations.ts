#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "fs"
import { join } from "path"
import { Project, ts } from "ts-morph"
import { language } from "#src/app/i18n/language.ts"

interface TranslationCall {
  text: string
  filePath: string
  line: number
  functionName: string
}

interface LanguageFile {
  code: string
  name: string
  path: string
}

/**
 * Extract all English text from translation function calls in the codebase
 */
export function extractTranslationTexts(projectPath: string = process.cwd()): TranslationCall[] {
  const texts: TranslationCall[] = []

  const project = new Project({
    tsConfigFilePath: `${projectPath}/tsconfig.json`,
    skipAddingFilesFromTsConfig: false,
  })

  const sourceFiles = project.getSourceFiles()

  const names = new Set(["ttt", "ttc", "ttc1", "ttc2", "ttc3", "ttl", "ttl1", "ttl2", "ttl3"])

  for (const sourceFile of sourceFiles) {
    const callExpressions = sourceFile.getDescendantsOfKind(ts.SyntaxKind.CallExpression)

    for (const callExpression of callExpressions) {
      const expression = callExpression.getExpression()

      // Check for direct ttt calls
      if (expression.getKind() !== ts.SyntaxKind.Identifier) {
        continue
      }

      const identifier = expression
      const name = identifier.getText()

      if (!names.has(name)) {
        // console.log("skipping", name)
        continue
      }

      const args = callExpression.getArguments()
      if (args.length < 1) {
        continue
      }

      const firstArg = args[0]
      if (!firstArg || firstArg.getKind() !== ts.SyntaxKind.StringLiteral) {
        continue
      }

      const text = (firstArg as any).getLiteralValue()
      const sourceFile = callExpression.getSourceFile()
      const start = callExpression.getStart()
      const location = sourceFile.getLineAndColumnAtPos(start)

      texts.push({
        text,
        filePath: sourceFile.getFilePath(),
        line: location.line,
        functionName: name,
      })
    }
  }

  return texts
}

/**
 * Get all language files to process
 */
function getLanguageFiles(projectPath: string): LanguageFile[] {
  return [
    {
      code: language.ru,
      name: "Russian",
      path: join(projectPath, "src/app/i18n/ru.json"),
    },
    {
      code: language.tj,
      name: "Tajik",
      path: join(projectPath, "src/app/i18n/tj.json"),
    },
  ]
}

/**
 * Load existing language file
 */
function loadLanguageFile(languageFile: LanguageFile): Record<string, string> {
  try {
    const content = readFileSync(languageFile.path, "utf-8")
    return JSON.parse(content)
  } catch (error) {
    console.warn(`Could not load existing ${languageFile.code}.json, creating new one`)
    return {}
  }
}

/**
 * Save updated language file
 */
function saveLanguageFile(languageFile: LanguageFile, data: Record<string, string>): void {
  const sortedEntries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
  const sortedData = Object.fromEntries(sortedEntries)
  writeFileSync(languageFile.path, JSON.stringify(sortedData, null, 2), "utf-8")
}

/**
 * Main function to extract ttt texts and update all language files
 */
export async function generateTranslationKeys(projectPath: string = process.cwd()): Promise<void> {
  console.log("Extracting English text from ttt function calls...")

  const translationTexts = extractTranslationTexts(projectPath)
  console.log(`Found ${translationTexts.length} translation calls with English text`)

  const languageFiles = getLanguageFiles(projectPath)
  let totalNewTranslations = 0
  const newKeys: string[] = []

  // Process each language file
  for (const languageFile of languageFiles) {
    console.log(`\nProcessing ${languageFile.name} (${languageFile.code}.json)...`)

    const existingTranslations = loadLanguageFile(languageFile)
    console.log(`Loaded ${Object.keys(existingTranslations).length} existing translations`)

    // Update translations with new texts
    let newCount = 0

    for (const translationCall of translationTexts) {
      const key = translationCall.text
      if (!Object.hasOwn(existingTranslations, key)) {
        // For English, use the text itself as value (for now)
        // For other languages, use empty string for translation
        const value = languageFile.code === "en" ? key : ""
        existingTranslations[key] = value
        newCount++

        // Add to new keys list (avoid duplicates)
        if (!newKeys.includes(key)) {
          newKeys.push(key)
        }

        console.log(`New: "${key}" (${translationCall.filePath}:${translationCall.line})`)
      }
    }

    // Save updated translations
    saveLanguageFile(languageFile, existingTranslations)

    totalNewTranslations += newCount
    console.log(`- New translations added: ${newCount}`)
    console.log(`- Total translations: ${Object.keys(existingTranslations).length}`)
    console.log(`- Updated: ${languageFile.path}`)
  }

  // Save new keys to new.json
  const newKeysPath = join(projectPath, "new.json")
  writeFileSync(newKeysPath, JSON.stringify(newKeys, null, 2), "utf-8")
  console.log("\nNew keys saved to: " + newKeysPath)

  // Function summary
  const functionCounts: Record<string, number> = {}
  for (const call of translationTexts) {
    functionCounts[call.functionName] = (functionCounts[call.functionName] || 0) + 1
  }

  console.log("\nOverall Summary:")
  console.log("- Total translation calls found: " + translationTexts.length)
  console.log("- Total new translations added: " + totalNewTranslations)
  console.log("- Language files updated: " + languageFiles.length)
  console.log("- New keys saved to new.json: " + newKeys.length)
  console.log("\nFunction breakdown:")
  for (const [funcName, count] of Object.entries(functionCounts).sort()) {
    console.log("- " + funcName + ": " + count + " calls")
  }

  // return

  // Call opencode for each language file if there are new keys
  if (newKeys.length > 0) {
    console.log("\nCalling opencode to add translations...")

    const opencodePromises = languageFiles.map(async (languageFile) => {
      const message = `Add translations from @src/app/i18n/new.json to @src/app/i18n/${languageFile.code}.json and generate any missing translation keys. Do not try to use any external tool or script.`
      console.log(`Running: opencode run message "${message}"`)
      return runOpencodeCommand(message)
    })

    await Promise.all(opencodePromises)
    console.log("All opencode commands completed.")
  } else {
    console.log("\nNo new keys found - skipping opencode calls.")
  }
}

async function runOpencodeCommand(message: string): Promise<void> {
  const cmd = `bun run opencode run message "${message}"`
  const process = Bun.spawn(["bun", "run", "opencode", "run", "message", message], {
    stdio: ["inherit", "inherit", "inherit"],
  })
  await process.exited
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2)
  const projectPath = args[0] || process.cwd()

  try {
    await generateTranslationKeys(projectPath)
  } catch (error) {
    console.error("Error:", error)
    process.exit(1)
  }
}
