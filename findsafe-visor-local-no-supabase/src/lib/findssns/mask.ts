export type DataType = "card" | "ssn" | "otro";

// Mask: keep first 4 and last 4 chars, replace middle with *
// SSN preserva los guiones (formato xxx-xx-xxxx).
export function maskValue(value: string, type: DataType): string {
  if (type === "ssn") {
    // 123-45-6789 -> 123-**-6789
    const m = value.match(/^(\d{3})-(\d{2})-(\d{4})$/);
    if (m) return `${m[1]}-**-${m[3]}`;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 8) {
    // not enough to keep 4+4, mask middle
    if (digits.length <= 4) return "*".repeat(digits.length);
    return digits.slice(0, 2) + "*".repeat(digits.length - 4) + digits.slice(-2);
  }
  return digits.slice(0, 4) + "*".repeat(digits.length - 8) + digits.slice(-4);
}