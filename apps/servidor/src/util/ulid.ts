import { ulid } from 'ulid';

export function nuevoId(): string {
  return ulid();
}
