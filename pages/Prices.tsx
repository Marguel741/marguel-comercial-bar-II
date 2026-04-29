// ANTES:
  const handleSave = (productId: string, productName: string) => {
    if (!canManagePrices) return;
    const updates = editingPrices[productId];
    const currentProduct = products.find(p => p.id === productId);
    if (!updates || !currentProduct) return;

    // Regista no histórico de preços (corrigido com campos reais)
    if (updates.sell !== undefined) {
      const newSellPrice = parseFloat(updates.sell.replace(',', '.'));
      if (!isNaN(newSellPrice) && newSellPrice !== currentProduct.sellPrice) {
        const historyEntry: PriceHistoryLog = {
          id: generateUUID(),
          productId,
          productName,
          date: formatDateISO(getSystemDate()),
          oldSellPrice: currentProduct.sellPrice,
          newSellPrice: newSellPrice,
          oldBuyPrice: currentProduct.buyPrice,
          newBuyPrice: updates.buy !== undefined ? parseFloat(updates.buy.replace(',', '.')) : currentProduct.buyPrice,
          changedBy: user?.name || 'Sistema',
          timestamp: Date.now()
        };
        // priceHistory gerido pelo ProductContext via Firestore
      }
    }

    const finalUpdates: Partial<Product> = {
      buyPrice: updates.buy !== undefined ? parseFloat(updates.buy.replace(',', '.')) : undefined,
      sellPrice: updates.sell !== undefined ? parseFloat(updates.sell.replace(',', '.')) : undefined,
      promoQty: updates.promoQty !== undefined ? parseFloat(updates.promoQty.replace(',', '.')) : undefined,
      promoPrice: updates.promoPrice !== undefined ? parseFloat(updates.promoPrice.replace(',', '.')) : undefined,

// DEPOIS:
  const handleSave = (productId: string, productName: string) => {
    if (!canManagePrices) return;
    const updates = editingPrices[productId];
    const currentProduct = products.find(p => p.id === productId);
    if (!updates || !currentProduct) return;

    // FIN-2: historyEntry removido — ProductContext.updateProduct já grava o histórico
    // quando sellPrice ou buyPrice muda (fix #7 do Chat 6)

    // FIN-1: validar parseFloat antes de incluir nos updates
    const parsedBuy = updates.buy !== undefined ? parseFloat(updates.buy.replace(',', '.')) : undefined;
    const parsedSell = updates.sell !== undefined ? parseFloat(updates.sell.replace(',', '.')) : undefined;
    const parsedPromoQty = updates.promoQty !== undefined ? parseFloat(updates.promoQty.replace(',', '.')) : undefined;
    const parsedPromoPrice = updates.promoPrice !== undefined ? parseFloat(updates.promoPrice.replace(',', '.')) : undefined;

    // Se algum valor numérico for NaN, não guarda
    if (parsedBuy !== undefined && isNaN(parsedBuy)) { showToast('Preço de compra inválido.'); return; }
    if (parsedSell !== undefined && isNaN(parsedSell)) { showToast('Preço de venda inválido.'); return; }
    if (parsedPromoQty !== undefined && isNaN(parsedPromoQty)) { showToast('Quantidade promocional inválida.'); return; }
    if (parsedPromoPrice !== undefined && isNaN(parsedPromoPrice)) { showToast('Preço promocional inválido.'); return; }

    const finalUpdates: Partial<Product> = {
      buyPrice: parsedBuy,
      sellPrice: parsedSell,
      promoQty: parsedPromoQty,
      promoPrice: parsedPromoPrice,
