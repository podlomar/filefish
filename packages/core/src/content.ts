export interface Content<
  Type extends string,
  Public extends {},
  Full extends Public
  > {
  type: Type,
  public: Public,
  full: Full,
};