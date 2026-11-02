/** DS-GAP: DS05. Build-only Polish copy; installed component sources stay intact. */
export function adaptDesignSystem(source: string, id: string): string | undefined {
  if (id.endsWith('/backend/forms/CrudForm.tsx')) {
    const replacements = [
      ['"Required"', '"Wymagane"'], ['"Optional"', '"Opcjonalne"'],
      ['"Saving…"', '"Zapisywanie…"'], ['            Cancel\n', '            Anuluj\n'],
    ];
    let output = source;
    for (const [before, after] of replacements) {
      if (!output.includes(before)) throw new Error(`DS adapter: changed CrudForm copy: ${before}`);
      output = output.replaceAll(before, after);
    }
    return output;
  }
  // DS-GAP: PanelShell uses a fixed panel-main ID. Multiple screens need unique skip targets.
  if (id.endsWith('/backend/layout/PanelShell.tsx')) {
    const fixed = 'const mainId = "panel-main";';
    if (!source.includes(fixed)) throw new Error('DS adapter: changed PanelShell ID');
    return 'import { useId } from "react";\n' + source.replace(fixed, 'const mainId = useId();');
  }
  return undefined;
}
