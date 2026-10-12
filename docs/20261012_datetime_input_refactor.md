# Refactor Date-Time Inputs to Separate Date & Time Fields

## Goal
Replace browser-native `datetime-local` inputs across the app with a reusable Solid component in `./ui` that separates date (date input) and time (5-minute granularity select), preserving the existing `YYYY-MM-DDTHH:mm` interface so backend, APIs, and validation remain unchanged.

## Decisions
- **Component Location**: `ui/input/datetime/InputDateTime.tsx` and `ui/input/datetime/inputDateTimeStateCreate.ts`, accessible via `#ui/input/datetime/InputDateTime.jsx`.
- **Date Control**: Native `<Input type="date" />` using `#ui/input/input/Input.jsx`.
- **Time Control**: Styled `<select>` dropdown with 5-minute increments (`00:00`, `00:05`, ... `23:55`) reusing the input styling classes (`classesInput`).
- **Data Contract**:
  - Accepts `value?: string` (`"YYYY-MM-DDTHH:mm"`), `onInput?: (value: string) => void`, `required?: boolean`, `disabled?: boolean`, `id?: string`, `class?: string`, `min?: string`, `max?: string`.
  - Emits `onInput("${date}T${time}")` when date and time are selected, or empty string if cleared.
  - Keeps all parent form state and backend APIs (Convex, ISO conversions, Valibot schemas) 100% unchanged.
- **Code Style**: View-only `.tsx`, logic and signal handling in `inputDateTimeStateCreate.ts`, one export per file, subject-first function names.

## Tasks
- [x] Task 1: Implement `timeOptions5MinGenerate.ts`, `inputDateTimeStateCreate.ts`, and `InputDateTime.tsx` under `ui/input/datetime/` along with unit tests.
- [x] Task 2: Refactor `src/admin/AdminEventDetailsForm.tsx` and `src/admin/AdminTicketProductsForm.tsx` to use `InputDateTime`.
- [x] Task 3: Refactor `src/admin/AdminScannerLinksPage.tsx` and `src/organizer/ScannerHelperManagement.tsx` to use `InputDateTime`.
- [x] Task 4: Run unit tests and type checks to ensure zero regressions.
