/* eslint-disable @typescript-eslint/no-empty-function */
import axios from 'axios'
import { Signer } from 'ethers'

import balances from './balances'
import { getDefaultConfig, mergeConfig } from './config'
import { StepExecutor } from './executionFiles/StepExecutor'
import { isRoutesRequest, isStep, isToken } from './typeguards'
import {
  ChainId,
  ChainKey,
  Order,
  PossibilitiesRequest,
  PossibilitiesResponse,
  Route,
  RoutesRequest,
  RoutesResponse,
  StatusResponse,
  Step,
  Token,
  TokenAmount,
} from '@lifinance/types'

import {
  ActiveRouteDictionary,
  Config,
  ConfigUpdate,
  ExecutionData,
  ExecutionSettings,
} from './types'
import StatusManager from './StatusManager'
import { parseBackendError } from './utils/parseError'
import { ValidationError } from './utils/errors'

class LIFI {
  private activeRouteDictionary: ActiveRouteDictionary = {}
  private config: Config = getDefaultConfig()

  /**
   * Get the current configuration of the SDK
   * @return {Config} - The config object
   */
  getConfig = (): Config => {
    return this.config
  }

  /**
   * Set a new confuration for the SDK
   * @param {ConfigUpdate} configUpdate - An object containing the configuration fields that should be updated.
   * @return {Config} The renewed config object
   */
  setConfig = (configUpdate: ConfigUpdate): Config => {
    this.config = mergeConfig(this.config, configUpdate)
    return this.config
  }

  /**
   * Get a set of current possibilities based on a request that specifies which chains, exchanges and bridges are preferred or unwanted.
   * @param {PossibilitiesRequest} request - Object defining preferences regarding chain, exchanges and bridges
   * @return {Promise<PossibilitiesResponse>} Object listing current possibilities for any-to-any cross-chain-swaps based on the provided preferences.
   * @throws {LifiError} Throws a LifiError if request fails.
   */
  getPossibilities = async (
    request?: PossibilitiesRequest
  ): Promise<PossibilitiesResponse> => {
    if (!request) request = {}

    // apply defaults
    request.bridges = request.bridges || this.config.defaultRouteOptions.bridges
    request.exchanges =
      request.exchanges || this.config.defaultRouteOptions.exchanges

    // send request
    try {
      const result = await axios.post<PossibilitiesResponse>(
        this.config.apiUrl + 'advanced/possibilities',
        request
      )
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Fetch information about a Token
   * @param {ChainKey | ChainId} chain - Id or key of the chain that contains the token
   * @param {string} token - Address or symbol of the token on the requested chain
   * @throws {LifiError} - Throws a LifiError if request fails
   */
  getToken = async (
    chain: ChainKey | ChainId,
    token: string
  ): Promise<Token> => {
    if (!chain) {
      throw new ValidationError('Required parameter "chain" is missing')
    }

    if (!token) {
      throw new ValidationError('Required parameter "token" is missing')
    }

    try {
      const result = await axios.get<Token>(this.config.apiUrl + 'token', {
        params: {
          chain,
          token,
        },
      })
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Get a quote for a token transfer
   * @param {ChainKey | ChainId} fromChain - The sending chain
   * @param {string} fromToken - The token that should be transferred. Can be the address of the symbol
   * @param {string} fromAddress - The sending wallet address
   * @param {string} fromAmount - The amount that should be sent
   * @param {ChainKey | ChainId} toChain - The receiving chain
   * @param {string} toToken - The token that should be transferred to. Can be the address or the symbol
   * @param {Order} order - Which kind of transfer should be preferred
   * @param {number} slippage - The maximum allowed slippage for the transfer
   * @param {string} integrator - A string containing tracking information about the integrator of the API
   * @param {string} referrer - A string containing tracking information about the referrer of the integrator
   * @param {string[]} allowBridges - List of bridges that are allowed for this transaction. Currently, available bridges are `hop`, `multichain`, `cbridge` and more
   * @param {string[]} denyBridges - List of bridges that are not allowed for this transaction. Currently, available bridges are `hop`, `multichain`, `cbridge` and more
   * @param {string[]} preferBridges - List of bridges that should be preferred for this transaction. Currently, available bridges are `hop`, `multichain`, `cbridge` and more
   * @param {string[]} allowExchanges - List of exchanges that are allowed for this transaction. Currently, available exchanges are aggregators such as `1inch`, `paraswap`, `openocean`, `0x` and a lot of dexes
   * @param {string[]} denyExchanges - List of exchanges that are not allowed for this transaction. Currently, available exchanges are aggregators such as `1inch`, `paraswap`, `openocean`, `0x` and a lot of dexes
   * @param {string[]} preferExchanges - List of exchanges that should be preferred for this transaction. Currently, available exchanges are aggregators such as `1inch`, `paraswap`, `openocean`, `0x` and a lot of dexes
   * @throws {LifiError} - Throws a LifiError if request fails
   */
  getQuote = async (
    fromChain: ChainKey | ChainId,
    fromToken: string,
    fromAddress: string,
    fromAmount: string,
    toChain: ChainKey | ChainId,
    toToken: string,
    order?: Order,
    slippage?: number,
    integrator?: string,
    referrer?: string,
    allowBridges?: string[],
    denyBridges?: string[],
    preferBridges?: string[],
    allowExchanges?: string[],
    denyExchanges?: string[],
    preferExchanges?: string[]
  ): Promise<Step> => {
    if (!fromChain)
      throw new ValidationError('Required parameter "fromChain" is missing')
    if (!fromToken)
      throw new ValidationError('Required parameter "fromToken" is missing')
    if (!fromAddress)
      throw new ValidationError('Required parameter "fromAddress" is missing')
    if (!fromAmount)
      throw new ValidationError('Required parameter "fromAmount" is missing')
    if (!toChain)
      throw new ValidationError('Required parameter "toChain" is missing')
    if (!toToken)
      throw new ValidationError('Required parameter "toToken" is missing')

    try {
      const result = await axios.get<Step>(this.config.apiUrl + 'quote', {
        params: {
          fromChain,
          toChain,
          fromToken,
          toToken,
          fromAddress,
          fromAmount,
          order,
          slippage,
          integrator,
          referrer,
          allowBridges,
          denyBridges,
          preferBridges,
          allowExchanges,
          denyExchanges,
          preferExchanges,
        },
      })
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Check the status of a cross chain transfer
   * @param {string} bridge - The bridging tool used for the transfer
   * @param {ChainId | ChainKey} fromChain - The sending chain
   * @param {ChainId | ChainKey} toChain - The receiving chain
   * @param {string} txHash - The transaction hash on the sending chain
   * @throws {LifiError} - Throws a LifiError if request fails
   */
  getStatus = async (
    bridge: string,
    fromChain: ChainId | ChainKey,
    toChain: ChainId | ChainKey,
    txHash: string
  ): Promise<StatusResponse> => {
    if (!bridge)
      throw new ValidationError('Required parameter "bridge" is missing')

    if (!fromChain)
      throw new ValidationError('Required parameter "fromChain" is missing')

    if (!toChain)
      throw new ValidationError('Required parameter "toChain" is missing')

    if (!txHash)
      throw new ValidationError('Required parameter "txHash" is missing')

    try {
      const result = await axios.get<StatusResponse>(
        this.config.apiUrl + 'status',
        {
          params: {
            bridge,
            fromChain,
            toChain,
            txHash,
          },
        }
      )
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Get a set of routes for a request that describes a transfer of tokens.
   * @param {RoutesRequest} routesRequest - A description of the transfer.
   * @return {Promise<RoutesResponse>} The resulting routes that can be used to realize the described transfer of tokens.
   * @throws {LifiError} Throws a LifiError if request fails.
   */
  getRoutes = async (routesRequest: RoutesRequest): Promise<RoutesResponse> => {
    if (!isRoutesRequest(routesRequest)) {
      throw new ValidationError('Invalid Routes Request')
    }

    // apply defaults
    routesRequest.options = {
      ...this.config.defaultRouteOptions,
      ...routesRequest.options,
    }

    // send request
    try {
      const result = await axios.post<RoutesResponse>(
        this.config.apiUrl + 'advanced/routes',
        routesRequest
      )
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Get the transaction data for a single step of a route
   * @param {Step} step - The step object.
   * @return {Promise<Step>} The step populated with the transaction data.
   * @throws {LifiError} Throws a LifiError if request fails.
   */
  getStepTransaction = async (step: Step): Promise<Step> => {
    if (!isStep(step)) {
      // While the validation fails for some users we should not enforce it
      // eslint-disable-next-line no-console
      console.warn('SDK Validation: Invalid Step', step)
    }

    try {
      const result = await axios.post<Step>(
        this.config.apiUrl + 'advanced/stepTransaction',
        step
      )
      return result.data
    } catch (e) {
      throw parseBackendError(e)
    }
  }

  /**
   * Stops the execution of an active route.
   * @param {Route} route - A route that is currently in execution.
   * @return {Route} The stopped route.
   */
  stopExecution = (route: Route): Route => {
    if (!this.activeRouteDictionary[route.id]) return route
    for (const executor of this.activeRouteDictionary[route.id].executors) {
      executor.stopStepExecution()
    }
    delete this.activeRouteDictionary[route.id]
    return route
  }

  /**
   * Executes a route until a user interaction is necessary (signing transactions, etc.) and then halts until the route is resumed.
   * @param {Route} route - A route that is currently in execution.
   */
  moveExecutionToBackground = (route: Route): void => {
    if (!this.activeRouteDictionary[route.id]) return
    for (const executor of this.activeRouteDictionary[route.id].executors) {
      executor.stopStepExecution()
    }
  }

  /**
   * Execute a route.
   * @param {Signer} signer - The signer required to send the transactions.
   * @param {Route} route - The route that should be executed. Cannot be an active route.
   * @param {ExecutionSettings} settings - An object containing settings and callbacks.
   * @return {Promise<Route>} The executed route.
   * @throws {LifiError} Throws a LifiError if the execution fails.
   */
  executeRoute = async (
    signer: Signer,
    route: Route,
    settings?: ExecutionSettings
  ): Promise<Route> => {
    // check if route is already running
    if (this.activeRouteDictionary[route.id]) return route // TODO: maybe inform user why nothing happens?

    return this.executeSteps(signer, route, settings)
  }

  /**
   * Resume the execution of a route that has been stopped or had an error while executing.
   * @param {Signer} signer - The signer required to send the transactions.
   * @param {Route} route - The route that is to be executed. Cannot be an active route.
   * @param {ExecutionSettings} settings - An object containing settings and callbacks.
   * @return {Promise<Route>} The executed route.
   * @throws {LifiError} Throws a LifiError if the execution fails.
   */
  resumeRoute = async (
    signer: Signer,
    route: Route,
    settings?: ExecutionSettings
  ): Promise<Route> => {
    const activeRoute = this.activeRouteDictionary[route.id]
    if (activeRoute) {
      const executionHalted = activeRoute.executors.some(
        (executor) => executor.executionStopped
      )
      if (!executionHalted) return route
    }

    return this.executeSteps(signer, route, settings)
  }

  private executeSteps = async (
    signer: Signer,
    route: Route,
    settings?: ExecutionSettings
  ): Promise<Route> => {
    const execData: ExecutionData = {
      route,
      executors: [],
      settings: { ...this.config.defaultExecutionSettings, ...settings },
    }
    this.activeRouteDictionary[route.id] = execData

    const statusManager = new StatusManager(
      route,
      this.activeRouteDictionary[route.id].settings,
      (route: Route) => (this.activeRouteDictionary[route.id].route = route)
    )

    // loop over steps and execute them
    for (let index = 0; index < route.steps.length; index++) {
      //check if execution has stopped in meantime
      if (!this.activeRouteDictionary[route.id]) break

      const step = route.steps[index]
      const previousStep = index !== 0 ? route.steps[index - 1] : undefined
      // check if step already done
      if (step.execution && step.execution.status === 'DONE') {
        continue
      }

      // update amount using output of previous execution. In the future this should be handled by calling `updateRoute`
      if (
        previousStep &&
        previousStep.execution &&
        previousStep.execution.toAmount
      ) {
        step.action.fromAmount = previousStep.execution.toAmount
      }

      let stepExecutor: StepExecutor
      try {
        stepExecutor = new StepExecutor(
          statusManager,
          this.activeRouteDictionary[route.id].settings
        )
        this.activeRouteDictionary[route.id].executors.push(stepExecutor)
        await stepExecutor.executeStep(signer, step)
      } catch (e) {
        this.stopExecution(route)
        throw e
      }

      // execution stopped during the current step, we don't want to continue to the next step so we return already
      if (stepExecutor.executionStopped) {
        return route
      }
    }

    //clean up after execution
    delete this.activeRouteDictionary[route.id]
    return route
  }

  /**
   * Update the ExecutionSettings for an active route.
   * @param {ExecutionSettings} settings - An object with execution settings.
   * @param {Route} route - The active route that gets the new execution settings.
   * @throws {ValidationError} Throws a ValidationError if parameters are invalid.
   */
  updateExecutionSettings = (
    settings: ExecutionSettings,
    route: Route
  ): void => {
    if (!this.activeRouteDictionary[route.id])
      throw new ValidationError(
        'Cannot set ExecutionSettings for unactive route!'
      )
    this.activeRouteDictionary[route.id].settings = {
      ...this.config.defaultExecutionSettings,
      ...settings,
    }
  }

  /**
   * Get the list of active routes.
   * @return {Route[]} A list of routes.
   */
  getActiveRoutes = (): Route[] => {
    return Object.values(this.activeRouteDictionary).map((dict) => dict.route)
  }

  /**
   * Return the current route information for given route. The route has to be active.
   * @param {Route} route - A route object.
   * @return {Route} The updated route.
   */
  getActiveRoute = (route: Route): Route | undefined => {
    return this.activeRouteDictionary[route.id].route
  }

  /**
   * Returns the balances of a specific token a wallet holds across all aggregated chains.
   * @param {string} walletAddress - A wallet address.
   * @param {Token} token - A Token object.
   * @return {Promise<TokenAmount | null>} An object containing the token and the amounts on different chains.
   * @throws {ValidationError} Throws a ValidationError if parameters are invalid.
   */
  getTokenBalance = async (
    walletAddress: string,
    token: Token
  ): Promise<TokenAmount | null> => {
    if (!walletAddress) {
      throw new ValidationError('Missing walletAddress')
    }

    if (!isToken(token)) {
      throw new ValidationError('Invalid token passed')
    }

    return balances.getTokenBalance(walletAddress, token)
  }

  /**
   * Returns the balances for a list tokens a wallet holds  across all aggregated chains.
   * @param {string} walletAddress - A wallet address.
   * @param {Token[]} tokens - A list of Token objects.
   * @return {Promise<TokenAmount[]>} A list of objects containing the tokens and the amounts on different chains.
   * @throws {ValidationError} Throws a ValidationError if parameters are invalid.
   */
  getTokenBalances = async (
    walletAddress: string,
    tokens: Token[]
  ): Promise<TokenAmount[]> => {
    if (!walletAddress) {
      throw new ValidationError('Missing walletAddress')
    }

    if (tokens.filter((token) => !isToken(token)).length) {
      throw new ValidationError('Invalid token passed')
    }

    return balances.getTokenBalances(walletAddress, tokens)
  }

  /**
   * This method queries the balances of tokens for a specific list of chains for a given wallet.
   * @param {string} walletAddress - A walletaddress.
   * @param {{ [chainId: number]: Token[] }} tokensByChain - A list of Token objects organized by chain ids.
   * @return {Promise<{ [chainId: number]: TokenAmount[] }} A list of objects containing the tokens and the amounts on different chains organized by the chosen chains.
   * @throws {ValidationError} Throws a ValidationError if parameters are invalid.
   */
  getTokenBalancesForChains = async (
    walletAddress: string,
    tokensByChain: { [chainId: number]: Token[] }
  ): Promise<{ [chainId: number]: TokenAmount[] }> => {
    if (!walletAddress) {
      throw new ValidationError('Missing walletAddress')
    }

    const tokenList = Object.values(tokensByChain).flat()
    if (tokenList.filter((token) => !isToken(token)).length) {
      throw new ValidationError('Invalid token passed')
    }

    return balances.getTokenBalancesForChains(walletAddress, tokensByChain)
  }
}

export default new LIFI()
