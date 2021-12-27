export function mutateObj<T, S>(obj: Record<string, T>, valueMutator: (val: T) => S, keyMutator: (key: string) => string = k => k): Record<string, S> {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, valueMutator(value)]))
}