export class Counter {

    private internalCounter: Record<string, number> = {}
    private readonly startingValue

    constructor(startingValue = 0) {
        this.startingValue = startingValue
    }

    increase(label: string, amount = 1) {
        if (label in this.internalCounter) {
            this.internalCounter[label] += amount
        } else {
            this.internalCounter[label] = this.startingValue + amount
        }
    }

    decrease(label: string, amount = 1) {
        if (label in this.internalCounter) {
            this.internalCounter[label] -= amount
        } else {
            this.internalCounter[label] = this.startingValue - amount
        }
    }

    increment(label: string) {
        this.increase(label, 1)
    }

    decrement(label: string) {
        this.decrease(label, 1)
    }

    /**
     * Get an object of the recorded counters.
     * @param ascending - whether to sort in ascending or descending order. (default descending)
     * @param limit - limit of how many labels to return with their counts. (default unlimited)
     */
    getCounts(ascending = false, limit: number | undefined = undefined) {
        return Object.fromEntries(Object.entries(this.internalCounter).sort(ascending ? (a, b) => a[1] - b[1] : (a, b) => b[1] - a[1]).slice(0, limit))
    }

    /**
     * Prints all labels with their counts to the console.
     */
    print(limit: number | undefined = undefined) {
        console.log(this.getCounts(false, limit))
    }
}