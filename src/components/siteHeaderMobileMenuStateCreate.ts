export function siteHeaderMobileMenuStateCreate(inputs: { onClose: () => void; onOpenAuth: () => void }) {
  const handleLinkClick = () => {
    inputs.onClose()
  }

  const handleOpenAuth = () => {
    inputs.onClose()
    inputs.onOpenAuth()
  }

  return {
    handleLinkClick,
    handleOpenAuth,
  }
}
