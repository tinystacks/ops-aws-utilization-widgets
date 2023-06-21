import { jest } from '@jest/globals';
export class MockCache {
  cacheName?: string;
  options?: Record<string, any>;
  get: jest.Mock<(key: string) => Promise<any>>;
  set: jest.Mock<(key: string, value: any) => Promise<void>>;
  getOrElse: jest.Mock<(key: string, refreshFunction: (...args: any[]) => Promise<any>) => Promise<any>>;

  constructor (cacheName?: string, options?: Record<string, any>) {
    this.cacheName = cacheName;
    this.options = options;
    this.get = jest.fn();
    this.set = jest.fn();
    this.getOrElse = jest.fn();
  }

  reset () {
    this.get.mockReset();
    this.set.mockReset();
    this.getOrElse.mockReset();
  }
  
  restore () {
    this.get.mockRestore();
    this.set.mockRestore();
    this.getOrElse.mockRestore();
  }
}

export function mockCache (cacheName: string, options: Record<string, any>): MockCache {
  return new MockCache(cacheName, options);
}