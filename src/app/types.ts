// src/types/sslcommerz-lts.d.ts
declare module "sslcommerz-lts" {
    export default class SSLCommerzPayment {
      constructor(store_id: string, store_passwd: string, is_live: boolean);
      init(data: any): Promise<any>;
    }
  }