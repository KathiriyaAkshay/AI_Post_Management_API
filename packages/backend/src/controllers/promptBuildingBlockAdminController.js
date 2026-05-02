import {
  listPromptBlocks,
  resolvePromptBlocks,
  joinResolvedBlockContents,
  getPromptBlockById,
  createPromptBlock,
  updatePromptBlock,
  deletePromptBlock,
} from '../services/promptBuildingBlockService.js';

export async function listPromptBlocksHandler(req, res) {
  try {
    const { product_type_id, category, block_key, include_global } = req.query;
    const data = await listPromptBlocks({
      productTypeId: product_type_id,
      category,
      blockKey: block_key,
      includeGlobal: include_global !== 'false',
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/** Merged blocks as used by image-generation / agent (global + product-type overrides). */
export async function resolvedPromptBlocksHandler(req, res) {
  try {
    const { product_type_id, categories } = req.query;
    const categoryList = categories
      ? String(categories)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : null;

    const blocks = await resolvePromptBlocks({
      productTypeId: product_type_id || null,
      categories: categoryList,
    });

    const combinedText = joinResolvedBlockContents(blocks);

    res.json({
      success: true,
      data: {
        blocks,
        combinedText,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPromptBlockHandler(req, res) {
  try {
    const data = await getPromptBlockById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

function normalizeBlockBody(b) {
  if (!b || typeof b !== 'object') return b;
  return {
    productTypeId: b.productTypeId ?? b.product_type_id,
    blockKey: b.blockKey ?? b.block_key,
    category: b.category,
    title: b.title,
    content: b.content,
    isActive: b.isActive ?? b.is_active,
    sortOrder: b.sortOrder ?? b.sort_order,
  };
}

export async function createPromptBlockHandler(req, res) {
  try {
    const data = await createPromptBlock(normalizeBlockBody(req.body));
    res.status(201).json({ success: true, data });
  } catch (err) {
    const status =
      err.message.includes('required') || err.message.includes('must be') || err.message.includes('category')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function updatePromptBlockHandler(req, res) {
  try {
    const data = await updatePromptBlock(req.params.id, normalizeBlockBody(req.body));
    res.json({ success: true, data });
  } catch (err) {
    const status = err.message.includes('not found')
      ? 404
      : err.message.includes('No valid') || err.message.includes('must be') || err.message.includes('category')
        ? 400
        : 500;
    res.status(status).json({ success: false, error: err.message });
  }
}

export async function deletePromptBlockHandler(req, res) {
  try {
    await deletePromptBlock(req.params.id);
    res.json({ success: true, message: 'Prompt block deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
