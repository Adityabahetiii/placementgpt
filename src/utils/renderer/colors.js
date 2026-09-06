export function getPhaseNodeColor(theme, index) { 
  return index % 2 === 0 ? theme.accent : theme.node; 
}
