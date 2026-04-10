/**
 * `customPoints` の本数と path から展開した頂点本数が一致しなくなったときに投げる。
 * 以前は入力へロールバックしていたが、検知困難なズレになるため例外にする。
 */
export class GenericSleevePipelineInvariantError extends Error {
  readonly code = "SLEEVE_PIPELINE_VERTEX_MISMATCH" as const;

  constructor(message: string) {
    super(message);
    this.name = "GenericSleevePipelineInvariantError";
  }
}
