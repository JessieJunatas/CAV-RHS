export function getChangedFields(
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  const oldValues: Record<string, any> = {}
  const newValues: Record<string, any> = {}

  Object.keys(newData).forEach((key) => {
    if (oldData[key] !== newData[key]) {
      oldValues[key] = oldData[key]
      newValues[key] = newData[key]
    }
  })

  return {
    oldData: Object.keys(oldValues).length ? oldValues : null,
    newData: Object.keys(newValues).length ? newValues : null,
  }
}