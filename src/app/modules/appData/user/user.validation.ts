import { z } from "zod";

const createUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: "নাম অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "নাম প্রয়োজন",
      })
      .trim()
      .min(1, { message: "নাম খালি হতে পারে না" }),
    address: z
      .string({
        invalid_type_error: "ঠিকানা অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "ঠিকানা প্রয়োজন",
      })
      .trim()
      .min(1, { message: "ঠিকানা খালি হতে পারে না" }),
    farmerId: z
      .string({
        invalid_type_error: "কৃষক আইডি অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "কৃষক আইডি প্রয়োজন",
      })
      .trim()
      .min(1, { message: "কৃষক আইডি খালি হতে পারে না" })
      .regex(/^fr[0-9]+$/, {
        message: 'কৃষক আইডি অবশ্যই "fr" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে',
      }),
    email: z
      .string({
        invalid_type_error: "ইমেল অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .email({ message: "ইমেল ফরম্যাট ঠিক নয়" })
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string({
        invalid_type_error: "ফোন নম্বর অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "ফোন নম্বর প্রয়োজন",
      })
      .trim()
      .length(11, { message: "ফোন নম্বর অবশ্যই ঠিক ১১টি সংখ্যার হতে হবে" })
      .regex(/^01[0-9]{9}$/, {
        message: 'ফোন নম্বর অবশ্যই "01" দিয়ে শুরু হবে এবং ১১ সংখ্যার হতে হবে',
      }),
    password: z
      .string({
        invalid_type_error: "পাসওয়ার্ড অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "পাসওয়ার্ড প্রয়োজন",
      })
      .min(6, { message: "পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে" })
      .max(10, { message: "পাসওয়ার্ড ১০ অক্ষরের বেশি হতে পারে না" }),
    passwordChangedAt: z
      .date({
        invalid_type_error:
          "পাসওয়ার্ড পরিবর্তনের সময় অবশ্যই একটি বৈধ তারিখ হতে হবে",
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: "ভূমিকা/রোল অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "ভূমিকা/রোল প্রয়োজন",
      })
      .refine((val) => ["admin", "farmer"].includes(val), {
        message: 'ভূমিকা/রোল অবশ্যই "admin" অথবা "farmer" হতে হবে',
      }),
    status: z
      .string({
        invalid_type_error: "স্ট্যাটাস অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "স্ট্যাটাস প্রয়োজন",
      })
      .refine((val) => ["blocked", "active"].includes(val), {
        message: 'স্ট্যাটাস অবশ্যই "blocked" অথবা "active" হতে হবে',
      })
      .default("active"),
    fieldIds: z
      .array(
        z
          .string({
            invalid_type_error: "ফিল্ড আইডি অবশ্যই একটি স্ট্রিং হতে হবে",
            required_error: "ফিল্ড আইডি প্রয়োজন",
          })
          .regex(/^fd[0-9]+$/, {
            message:
              'ফিল্ড আইডি অবশ্যই "fd" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে',
          }),
        { required_error: "ফিল্ড আইডি অ্যারে প্রয়োজন" }
      )
      .optional(),
  }),
});

const updateUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: "নাম অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .trim()
      .min(1, { message: "নাম খালি হতে পারে না" })
      .optional(),
    address: z
      .string({
        invalid_type_error: "ঠিকানা অবশ্যই একটি স্ট্রিং হতে হবে",
        required_error: "ঠিকানা প্রয়োজন",
      })
      .trim()
      .min(1, { message: "ঠিকানা খালি হতে পারে না" }).optional(),
    farmerId: z
      .string({
        invalid_type_error: "কৃষক আইডি অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .trim()
      .min(1, { message: "কৃষক আইডি খালি হতে পারে না" })
      .regex(/^fr[0-9]+$/, {
        message: 'কৃষক আইডি অবশ্যই "fr" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে',
      })
      .optional(),
    email: z
      .string({
        invalid_type_error: "ইমেল অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .email({ message: "ইমেল ফরম্যাট ঠিক নয়" })
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string({
        invalid_type_error: "ফোন নম্বর অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .trim()
      .length(11, { message: "ফোন নম্বর অবশ্যই ঠিক ১১টি সংখ্যার হতে হবে" })
      .regex(/^01[0-9]{9}$/, {
        message: 'ফোন নম্বর অবশ্যই "01" দিয়ে শুরু হবে এবং ১১ সংখ্যার হতে হবে',
      })
      .optional(),
    password: z
      .string({
        invalid_type_error: "পাসওয়ার্ড অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .min(6, { message: "পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে" })
      .max(10, { message: "পাসওয়ার্ড ১০ অক্ষরের বেশি হতে পারে না" })
      .optional(),
    passwordChangedAt: z
      .date({
        invalid_type_error:
          "পাসওয়ার্ড পরিবর্তনের সময় অবশ্যই একটি বৈধ তারিখ হতে হবে",
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: "ভূমিকা/রোল অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .refine((val) => ["admin", "farmer"].includes(val), {
        message: 'ভূমিকা/রোল অবশ্যই "admin" অথবা "farmer" হতে হবে',
      })
      .optional(),
    status: z
      .string({
        invalid_type_error: "স্ট্যাটাস অবশ্যই একটি স্ট্রিং হতে হবে",
      })
      .refine((val) => ["blocked", "active"].includes(val), {
        message: 'স্ট্যাটাস অবশ্যই "blocked" অথবা "active" হতে হবে',
      })
      .optional(),
    fieldIds: z
      .array(
        z
          .string({
            invalid_type_error: "ফিল্ড আইডি অবশ্যই একটি স্ট্রিং হতে হবে",
          })
          .regex(/^fd[0-9]+$/, {
            message:
              'ফিল্ড আইডি অবশ্যই "fd" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে',
          }),
        { required_error: "ফিল্ড আইডি অ্যারে প্রয়োজন" }
      )
      .optional(),
  }),
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
};
