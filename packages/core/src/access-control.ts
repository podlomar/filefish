import { Entry } from "./entry.js";

export abstract class AccessControl {
  public readonly parent: AccessControl | null;
  
  public constructor(parent: AccessControl | null = null) {
    this.parent = parent;
  }
  
  public abstract check(): boolean;
  public abstract childAccess(entry: Entry<any>): AccessControl;
}

export class NoAccess extends AccessControl {
  public constructor(parent: AccessControl) {
    super(parent);
  }
  
  public check(): false {
    return false;
  }

  public childAccess(entry: Entry<any>): NoAccess {
    return new NoAccess(this);
  };
}

export class AllAccess extends AccessControl {
  public constructor(parent: AccessControl) {
    super(parent);
  }
  
  public check(): true {
    return true;
  }

  public childAccess(entry: Entry<any>): AllAccess {
    return new AllAccess(this);
  };
}