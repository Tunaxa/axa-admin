import type { Block } from './types';

const LIST_TYPES = new Set<Block['type']>(['bulleted_list_item', 'numbered_list_item']);

/**
 * Turns a page's blocks into one Markdown document.
 *
 * Going through Markdown rather than mapping each block straight to an element
 * is what makes the inline formatting work: a paragraph's text can hold
 * `**bold**`, a link or a code span, and the renderer handles all of it in one
 * place instead of every block type growing its own parser.
 */
export function blocksToMarkdown(blocks: Block[]): string {
  const chunks: string[] = [];

  blocks.forEach((block, index) => {
    const markdown = toMarkdown(block);

    if (markdown === null) {
      return;
    }

    // Consecutive list items have to stay on adjacent lines, or Markdown reads
    // each one as a list of its own and the spacing falls apart.
    const previous = blocks[index - 1];
    const continuesList =
      previous !== undefined && LIST_TYPES.has(block.type) && previous.type === block.type;

    if (chunks.length > 0) {
      chunks.push(continuesList ? '\n' : '\n\n');
    }

    chunks.push(markdown);
  });

  return chunks.join('');
}

function toMarkdown(block: Block): string | null {
  const text = block.text.trim();

  switch (block.type) {
    case 'heading_1':
      return `# ${text}`;
    case 'heading_2':
      return `## ${text}`;
    case 'heading_3':
      return `### ${text}`;
    case 'bulleted_list_item':
      return `- ${indent(text, '  ')}`;
    case 'numbered_list_item':
      // Always `1.` — Markdown numbers the rendered list itself, so inserting
      // an item in the middle cannot leave the rest counting wrong.
      return `1. ${indent(text, '   ')}`;
    case 'quote':
      return prefixLines(text, '> ');
    case 'callout':
      return prefixLines(`${icon(block)}${text}`, '> ');
    case 'code':
      return fence(block);
    case 'divider':
      return '---';
    case 'image':
      return image(block);
    case 'paragraph':
      return text;
    default:
      // A block type this build does not know about. Dropping it silently
      // would make content vanish with no explanation, so the text is kept.
      return text;
  }
}

/** Keeps a multi-line block inside its list item instead of ending the list. */
function indent(text: string, padding: string): string {
  return text.split('\n').join(`\n${padding}`);
}

function prefixLines(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function icon(block: Block): string {
  const value = block.props?.icon;

  return typeof value === 'string' && value.length > 0 ? `${value} ` : '';
}

/**
 * Fences a code block with more backticks than the code itself contains.
 *
 * A snippet that shows a Markdown fence would otherwise close the block early
 * and spill the rest of the page into the document as markup.
 */
function fence(block: Block): string {
  const language = typeof block.props?.language === 'string' ? block.props.language : '';

  const longestRun = Math.max(
    0,
    ...[...block.text.matchAll(/`+/g)].map((match) => match[0].length),
  );
  const ticks = '`'.repeat(Math.max(3, longestRun + 1));

  return `${ticks}${language}\n${block.text}\n${ticks}`;
}

function image(block: Block): string | null {
  const url = block.props?.url;

  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }

  const alt = typeof block.props?.alt === 'string' ? block.props.alt : '';

  return `![${alt}](${url})`;
}
