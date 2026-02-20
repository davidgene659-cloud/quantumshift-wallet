export const Wallet = {
  list: async () => [],
  create: async (data) => ({ id: `w_${Date.now()}`, ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ id }),
};
