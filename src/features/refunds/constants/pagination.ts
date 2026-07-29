// Quantos itens a listagem mostra por página. Vive na feature porque é uma
// decisão de apresentação dos reembolsos, e é exportada pela fachada porque o
// router-loaders (camada app) precisa dela — o Item 9 proíbe alcançar o
// interior de uma feature.
export const REFUNDS_PER_PAGE = 10;
