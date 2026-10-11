# SMTinel 8D English Handoff HTML

This exporter keeps the same PPTX-to-HTML conversion flow but applies a final post-processing layer for customer-facing handoff packages.

## Output behavior

- Viewer language is English by default.
- The SMTinel icon is embedded as an inline SVG favicon and Apple touch icon.
- The visual skin uses a light executive handoff style instead of the prior dark generic viewer.
- Slide images, embedded Excel files, .eml/.msg mail evidence, links, notes and recovered attachments are preserved.
- Mobile fallback still works without JavaScript and shows evidence/Excel before the slide list.

## Pipeline

`Convertir_PPTX_a_HTML_iOS.py` runs the following sequence:

1. `SMTinel_PPTX_a_HTML_Converter.py`
2. `SMTinel_8D_iOS_Progressive_Patch.py`
3. `SMTinel_8D_Mail_Evidence_Patch.py` when present
4. `SMTinel_8D_Mobile_Excel_Visibility_Patch.py` when present
5. `SMTinel_8D_Handoff_English_Theme_Patch.py` when present

The final theme patch does not modify the source PowerPoint or alter recovered evidence bytes.
