// This file holds generator functions to create objects for testing purposes

import {
  ChainId,
  CoinKey,
  findDefaultToken,
  Route,
  Step,
} from '@lifinance/types'

const SOME_TOKEN = findDefaultToken(CoinKey.USDC, ChainId.DAI)
const SOME_OTHER_TOKEN = findDefaultToken(CoinKey.USDT, ChainId.DAI)

const SOME_DATE = new Date('2021-04-10').getTime()

export const buildStepObject = ({
  includingExecution = true,
}: {
  includingExecution?: boolean
}): Step => ({
  id: '8d3a0474-4ee3-4a7a-90c7-2a2264b7f3a9',
  type: 'swap',
  tool: '1inch',
  action: {
    fromChainId: 137,
    toChainId: 137,
    fromToken: SOME_TOKEN,
    toToken: SOME_OTHER_TOKEN,
    fromAmount: '1000000',
    slippage: 0.03,
    fromAddress: '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0',
    toAddress: '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0',
  },
  estimate: {
    fromAmount: '1000000',
    toAmount: '260982615655554',
    toAmountMin: '253153137185887',
    approvalAddress: '0x11111112542d85b3ef69ae05771c2dccff4faa26',
    executionDuration: 300,
  },
  execution: includingExecution
    ? {
        status: 'PENDING',
        process: [
          {
            id: 'process1',
            startedAt: SOME_DATE,
            message: 'Somethings done',
            status: 'DONE',
            doneAt: SOME_DATE + 10,
            txHash: '0x11111112542d85b3ef69ae05771c2dccff4faa26',
            txLink: 'https://example.com',
          },
          {
            id: 'process2',
            startedAt: SOME_DATE + 20,
            message: 'Somethings pending',
            status: 'PENDING',
          },
        ],
        fromAmount: '1000000',
        toAmount: '261490494702370',
      }
    : undefined,
})

export const buildRouteObject = ({
  step = buildStepObject({}),
}: {
  step?: Step
}): Route => ({
  id: '0x433df53dbf6dbd7b946fc4f3b501c3ff32957d77d96c9d5ba1805b01eb6461cc',
  fromChainId: 137,
  fromAmountUSD: '1.00',
  fromAmount: '1000000',
  fromToken: SOME_TOKEN,
  fromAddress: '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0',
  toChainId: 137,
  toAmountUSD: '1.00',
  toAmount: '260982615655554',
  toAmountMin: '253153137185887',
  toToken: SOME_OTHER_TOKEN,
  toAddress: '0x552008c0f6870c2f77e5cC1d2eb9bdff03e30Ea0',
  gasCostUSD: '0.01',
  steps: [step],
})
