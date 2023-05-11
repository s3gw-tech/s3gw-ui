import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

type Message = string | undefined;

@Injectable({
  providedIn: 'root'
})
export class BlockUiService {
  public readonly visible$: Observable<boolean>;
  public readonly message$: Observable<Message>;

  private visible: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private message: BehaviorSubject<Message> = new BehaviorSubject<Message>(undefined);

  constructor() {
    this.visible$ = this.visible.asObservable();
    this.message$ = this.message.asObservable();
  }

  start(message: Message): void {
    this.visible.next(true);
    this.message.next(message);
  }

  stop(): void {
    this.visible.next(false);
  }

  update(message: Message): void {
    this.message.next(message);
  }

  resetGlobal(): void {
    this.visible.next(false);
    this.message.next(undefined);
  }
}
