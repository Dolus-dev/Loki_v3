export class addGuildToDbFailure extends Error {
  public guildId: string;
  public date: Date = new Date();

  constructor(message: string, guildId: string, options: ErrorOptions) {
    super(message, options);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, addGuildToDbFailure);
    }

    this.name = 'AddGuildToDbFailure';

    this.guildId = guildId;
  }
}
