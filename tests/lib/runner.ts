export class TestRun {
  passed = 0;
  failed = 0;

  pass(label: string): void {
    console.log(`  PASS ${label}`);
    this.passed += 1;
  }

  fail(label: string, detail?: string): void {
    console.log(`  FAIL ${label}`);
    if (detail) {
      console.log(`     ${detail}`);
    }
    this.failed += 1;
  }

  section(label: string): void {
    console.log("");
    console.log(`${label}:`);
  }

  summary(extraLines: string[] = []): void {
    for (const line of extraLines) {
      console.log(line);
    }
    console.log("");
    console.log(`Passed: ${this.passed}  Failed: ${this.failed}`);
  }

  exitCode(): number {
    return this.failed === 0 ? 0 : 1;
  }
}

export function containsCaseInsensitive(haystack: string, needle: string): boolean {
  return haystack.toLocaleLowerCase().includes(needle.toLocaleLowerCase());
}

export function envNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
