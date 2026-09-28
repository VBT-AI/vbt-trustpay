declare module "@walletconnect/ethereum-provider" {
  type Provider = { request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown> };
  const EthereumProvider: { init(options: { projectId: string; chains: number[]; optionalChains?: number[]; showQrModal: boolean; methods: string[]; events: string[]; metadata: { name: string; description: string; url: string; icons: string[] } }): Promise<Provider & { connect(): Promise<void> }> };
  export default EthereumProvider;
}
