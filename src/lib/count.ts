/** Formats a counter value; grouping (30,000) is used only when the editor's value had commas. */
export function formatCount(value: number, grouped: boolean): string {
  return grouped ? new Intl.NumberFormat('en-IN').format(value) : String(value);
}
