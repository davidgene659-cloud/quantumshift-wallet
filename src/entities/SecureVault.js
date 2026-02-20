export const SecureVault = {
  list: async () => [],
  create: async (data) => ({ id: `sv_${Date.now()}`, ...data }),
  update: async (id, data) => ({ id, ...data }),
  delete: async (id) => ({ id }),
};
