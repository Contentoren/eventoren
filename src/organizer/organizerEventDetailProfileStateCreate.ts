import { useContext } from "solid-js"
import { adminSidebarContext } from "../admin/adminSidebarContext.ts"

export function organizerEventDetailProfileStateCreate() {
  const sidebar = useContext(adminSidebarContext)
  return { renderContent: () => sidebar?.renderContent() }
}
