/** Shared chainable Supabase client stub for page smoke renders. */
export function createSupabaseSmokeClient() {
  const result = { data: [] as unknown[], error: null as null | { message: string } };

  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    select: chain,
    insert: chain,
    update: chain,
    upsert: chain,
    delete: chain,
    eq: chain,
    neq: chain,
    gt: chain,
    gte: chain,
    lt: chain,
    lte: chain,
    like: chain,
    ilike: chain,
    is: chain,
    in: chain,
    contains: chain,
    containedBy: chain,
    range: chain,
    order: chain,
    limit: chain,
    offset: chain,
    match: chain,
    filter: chain,
    not: chain,
    or: chain,
    textSearch: chain,
    csv: chain,
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    then: (resolve: (value: typeof result) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  });

  return {
    from: () => builder,
    rpc: async () => ({ data: [], error: null }),
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    channel: () => ({
      on: function on() {
        return this;
      },
      subscribe: () => ({ unsubscribe: () => undefined }),
    }),
    removeChannel: () => undefined,
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        download: async () => ({ data: null, error: null }),
      }),
    },
    functions: {
      invoke: async () => ({ data: null, error: null }),
    },
  };
}
