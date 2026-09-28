// Return destinations are deliberately limited to this app's learning routes.
export function safeLearningDestination(value: string | undefined) {
  if (!value || !/^\/(?:app|learn\/[-a-zA-Z0-9_]+|teachers\/[-a-zA-Z0-9_]+|unlock\/[-a-zA-Z0-9_]+|learning|chats|profile)$/.test(value)) return "/app";
  return value;
}
