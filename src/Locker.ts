import {Injectable, Inject, OpaqueToken} from '@angular/core'

import {IStorageSetConfig, ILockerConfig, DriverType} from './metadata'
import {Driver} from './Driver'
import {PollyfillDriver} from './PolyfillDriver'
import {DRIVERS, DRIVER_TYPES} from './DriverTypes'

import {isNil} from './helpers'

export const LOCKER_USER_CONFIG = new OpaqueToken('LOCKER_USER_CONFIG')

export const LOCKER_DEFAULT_CONFIG_PROVIDER = {
  provide: LOCKER_USER_CONFIG,
  useValue: {
    namespaceSeparator: ':',
    driverFallback: DRIVERS.SESSION,
    driverNamespace: ''
  }
}


@Injectable()
export class LockerConfig {
  public driverNamespace: string
  public driverFallback: DRIVERS|DRIVERS[]
  public namespaceSeparator: string

  constructor(@Inject(LOCKER_USER_CONFIG) config: ILockerConfig) {
    this.driverNamespace = !config || isNil(config.driverNamespace) ? '' : config.driverNamespace
    this.driverFallback = !config || isNil(config.driverFallback) ? DRIVERS.SESSION : config.driverFallback
    this.namespaceSeparator = !config || isNil(config.namespaceSeparator) ? ':' : config.namespaceSeparator
  }
}

@Injectable()
export class Locker {
  private driverFallback: DRIVERS|DRIVERS[]
  private namespace: string
  private separator: string

  constructor(@Inject(DRIVER_TYPES) public driverTypes: DriverType[], public lockerConfig: LockerConfig) {
    this.setNamespace()
    this.setSeparator()
    this.setDriverFallback()
  }

  public setNamespace(namespace: string = this.lockerConfig.driverNamespace) {
    this.namespace = namespace
  }

  public setSeparator(separator: string = this.lockerConfig.namespaceSeparator) {
    this.separator = separator
  }

  public setDriverFallback(driverFallback: DRIVERS|DRIVERS[] = this.lockerConfig.driverFallback) {
    this.driverFallback = driverFallback
  }

  public set(type: DRIVERS, key, data, config?: IStorageSetConfig) {
    this._getDriver(type).set(this._makeKey(key), data, config)
  }

  public get(type: DRIVERS, key) {
    return this._getDriver(type).get(this._makeKey(key))
  }

  public has(type: DRIVERS, key) {
    return this._getDriver(type).has(this._makeKey(key))
  }

  public remove(type: DRIVERS, key) {
    this._getDriver(type).remove(this._makeKey(key))
  }

  public key(type: DRIVERS, index?) {
    return this._decodeKey(this._getDriver(type).key(index))
  }

  public clear(type: DRIVERS) {
    this._getDriver(type).clear()
  }

  private _makeKey(key: string): string {
    return this.namespace ? `${this.namespace}${this.separator}${key}` : key
  }

  private _decodeKey(key: string): string {
    if (this.namespace)
      return key.slice(this.namespace.length + this.separator.length)
    else
      return key
  }

  private _getDriver(type: DRIVERS): Driver {
    const askedDriver = this._getDriverType(type)

    if (askedDriver && askedDriver.storage.isSupported())
      return askedDriver.storage
    else
      return this._getFallbackDriverType().storage
  }

  private _getDriverType(type: DRIVERS): DriverType {
    return this.driverTypes.find(driverType => driverType.type === type)
  }

  private _getFallbackDriverType(): DriverType {
    if (Array.isArray(this.driverFallback)) {
      return this.driverFallback
        .map((type) => this._getDriverType(type))
        .find(driverType => driverType.storage.isSupported()) || this._getDriverType(DRIVERS.MEMORY)
    } else if (this.driverFallback) {
      const driverType = this._getDriverType(this.driverFallback)

      return driverType.storage.isSupported() ? driverType : this._getDriverType(DRIVERS.MEMORY)
    } else {
      return this._getDriverType(DRIVERS.MEMORY)
    }
  }
}
