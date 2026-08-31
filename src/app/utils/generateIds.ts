import { randomInt } from "crypto";
import { FieldModel } from "../modules/appData/fields/fields.model";
import { UserModel } from "../modules/appData/user/user.model";
import { TUserRole } from "../modules/appData/user/user.interface";
import AppError from "../errors/AppError";
import httpStatus from "http-status";

const DIGITS = 8;
const MAX_ATTEMPTS = 5;

/**
 * The previous implementation was `(await Model.find()).length + 1`, which
 * loaded every document just to count them and raced under concurrent
 * registration — two simultaneous signups could be handed the same id.
 *
 * These generate a random suffix instead and confirm uniqueness against a
 * unique index, retrying on the rare collision. Random ids are also not
 * enumerable, unlike a sequential counter.
 */
const randomSuffix = (): string =>
  String(randomInt(0, 10 ** DIGITS)).padStart(DIGITS, "0");

const generateUnique = async (
  prefix: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> => {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = `${prefix}${randomSuffix()}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new AppError(
    httpStatus.INTERNAL_SERVER_ERROR,
    `Could not generate a unique ${prefix} id after ${MAX_ATTEMPTS} attempts`
  );
};

/** Role-prefixed public identifier, e.g. "farmer48392017" / "expert10238475". */
export const generateUserCode = async (role: TUserRole): Promise<string> =>
  generateUnique(role, async (candidate) =>
    Boolean(await UserModel.exists({ userCode: candidate }))
  );

export const generateFieldId = async (): Promise<string> =>
  generateUnique("field", async (candidate) =>
    Boolean(await FieldModel.exists({ fieldId: candidate }))
  );
