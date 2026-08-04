import type { DataProviderName } from '@/types';
import type { IDataProvider } from './types';
import { eastmoneyProvider } from './EastMoneyProvider';
import { sinaProvider } from './SinaProvider';
import { tencentProvider } from './TencentProvider';
import { akShareProvider } from './AKShareProvider';
import { tonghuashunProvider } from './TonghuashunProvider';
import { DEFAULT_PROVIDER } from '@/constants';

export { tencentProvider };

const registry: Record<DataProviderName, IDataProvider> = {
  eastmoney: eastmoneyProvider,
  sina: sinaProvider,
  tencent: tencentProvider,
  tonghuashun: tonghuashunProvider,
  akshare: akShareProvider,
};

/** 获取指定数据源（默认按 .env / DEFAULT_PROVIDER） */
export function getProvider(name: DataProviderName = DEFAULT_PROVIDER): IDataProvider {
  return registry[name] ?? eastmoneyProvider;
}

/** 列出所有已注册数据源 */
export function listProviders(): DataProviderName[] {
  return Object.keys(registry) as DataProviderName[];
}

export type { IDataProvider, RankType } from './types';
