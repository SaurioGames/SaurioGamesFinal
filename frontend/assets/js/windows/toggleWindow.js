async function toggleWindow(windowId) {
  const window = document.getElementById(windowId);
  if (window) {
    window.showModal();
  }
}
