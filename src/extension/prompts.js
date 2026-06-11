/**
 * @param {{ title: string, text: string }} lastEligible
 * @returns {string}
 */
function buildRichHtmlPrompt(lastEligible) {
  return [
    'Transform the following answer into a standalone, production-quality HTML artifact in the htmlify style.',
    'Return ONLY a single ```html fenced block and nothing else.',
    'Requirements:',
    '- Preserve the factual content and conclusions.',
    '- Prefer visual structure over prose walls: use scoreboards, timelines, matrices, diagrams, tabs, accordions, or side-by-side comparisons when they clarify the work.',
    '- Treat HTML as an operator surface: make the result scannable, discussable, and actionable.',
    '- Include the smallest useful artifact shape for the source: brief, deck, implementation map, review packet, report, explainer, or lightweight editor.',
    '- Improve hierarchy, density, labels, and information scent without adding generic SaaS decoration.',
    '- Use inline CSS only. No external assets, scripts, CDNs, or fonts.',
    '- Make it responsive and print-friendly.',
    '- Add simple inline SVG diagrams only if they materially improve comprehension.',
    '- Use semantic sections, accessible contrast, stable spacing, and restrained motion-free presentation.',
    '- Do not mention that this was transformed from another answer.',
    '',
    `Title suggestion: ${lastEligible.title}`,
    '',
    'Source answer:',
    '```text',
    lastEligible.text,
    '```',
  ].join('\n');
}

module.exports = {
  buildRichHtmlPrompt,
};
