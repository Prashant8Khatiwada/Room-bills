import { listBillTemplates, createBillTemplate, updateBillTemplate, approveBillTemplate, deleteBillTemplate } from './billTemplates';

export async function listProducts(roomId: string, userId: string) {
  return listBillTemplates(roomId, userId, 'expense');
}

export async function createProduct(roomId: string, userId: string, data: any) {
  return createBillTemplate(roomId, userId, {
    name: data.name,
    category: 'quantity',
    billCategory: 'expense',
    defaultAmount: data.defaultPrice || data.defaultAmount || 0,
  });
}

export async function updateProduct(roomId: string, productId: string, userId: string, data: any) {
  return updateBillTemplate(roomId, productId, userId, {
    name: data.name,
    category: 'quantity',
    defaultAmount: data.defaultPrice || data.defaultAmount,
  });
}

export async function approveProduct(roomId: string, productId: string, userId: string) {
  return approveBillTemplate(roomId, productId, userId);
}

export async function deleteProduct(roomId: string, productId: string, userId: string) {
  return deleteBillTemplate(roomId, productId, userId);
}
