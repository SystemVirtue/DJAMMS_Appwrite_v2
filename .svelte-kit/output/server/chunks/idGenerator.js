function generateAppwriteId(prefix = "", maxLength = 36) {
  const timestamp = Date.now().toString().slice(-8);
  const randomStr = Math.random().toString(36).substr(2, 6);
  const baseId = prefix ? `${prefix}-${timestamp}-${randomStr}` : `${timestamp}-${randomStr}`;
  return baseId.length > maxLength ? baseId.substring(0, maxLength) : baseId;
}
const InstanceIds = {
  dashboard: () => generateAppwriteId("dash"),
  player: () => generateAppwriteId("play"),
  queue: () => generateAppwriteId("queue"),
  playlist: () => generateAppwriteId("list"),
  admin: () => generateAppwriteId("admin"),
  tab: () => generateAppwriteId("tab"),
  window: () => generateAppwriteId("win"),
  session: () => generateAppwriteId("sess"),
  background: () => generateAppwriteId("bg"),
  user: () => generateAppwriteId("usr"),
  queueManagerTab: () => generateAppwriteId("qtab")
};
export {
  InstanceIds as I
};
