// Web mock for react-native-iap
export const initConnection = async () => false;
export const endConnection = () => {};
export const fetchProducts = async () => [];
export const getAvailablePurchases = async () => [];
export const requestPurchase = async () => {};
export const finishTransaction = async () => {};
export const purchaseUpdatedListener = () => ({ remove: () => {} });
export const purchaseErrorListener = () => ({ remove: () => {} });
