// from https://github.com/pm2/tx2/blob/main/API.md

/**
 * Report Events, Metrics, Issues, Actions to PM2 and PM2.io.
 */
declare module 'tx2' {
  /**
   * Expose a Metric of type: Counter. By calling .inc() or .dec() you update that value
   *
   * @param name - Name of the Metric
   */
  export function counter(name: string): Counter

  export class Counter {
    /**
     * Increment value
     */
    inc(by: number = 1)

    /**
     * Decrement value
     */
    dec()

    val(): number

    reset()
  }

  /**
   * Values that are measured as events / interval.
   *
   * @param samples - the rate unit in seconds. Defaults to 1 sec.
   * @param timeframe - the timeframe in seconds over which events will be analyzed. Defaults to 60 sec.
   * @param name - label for metric. eg req/sec
   */
  export function meter({
                          samples = 1,
                          timeframe = 60,
                          name
                        }: { samples?: number, timeframe?: number, name: string }): Meter

  export class Meter {
    mark()

    val(): number
  }
}