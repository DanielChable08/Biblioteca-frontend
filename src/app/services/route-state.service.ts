import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class StateService {

    saveState<T>(key: string, state: T): void {
        sessionStorage.setItem(key, JSON.stringify(state));
    }

    getState<T>(key: string): T | null {
        const state = sessionStorage.getItem(key);

        if (!state) {
            return null;
        }

        return JSON.parse(state) as T;
    }

    clearState(key: string): void {
        sessionStorage.removeItem(key);
    }

    restoreState<T>(key: string, defaultValue: T): T {

        const state = sessionStorage.getItem(key);

        return state
            ? JSON.parse(state)
            : defaultValue;
    }

}