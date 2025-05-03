import { z } from 'zod';

// Schema for TFieldData
const fieldDataSchema = z.object({
  fieldId: z
    .string({
      invalid_type_error: 'জমির আইডি অবশ্যই একটি স্ট্রিং হতে হবে',
      required_error: 'জমির আইডি প্রয়োজন',
    })
    .trim()
    .min(1, { message: 'জমির আইডি খালি হতে পারে না' })
    .regex(/^fd[0-9]+$/, { message: 'জমির আইডি অবশ্যই "fd" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে' }),
  fieldName: z
    .string({
      invalid_type_error: 'জমির নাম অবশ্যই একটি স্ট্রিং হতে হবে',
      required_error: 'জমির নাম প্রয়োজন',
    })
    .trim()
    .min(1, { message: 'জমির নাম খালি হতে পারে না' }),
  cropName: z
    .string({
      invalid_type_error: 'ফসলের নাম অবশ্যই একটি স্ট্রিং হতে হবে',
      required_error: 'ফসলের নাম প্রয়োজন',
    })
    .trim()
    .min(1, { message: 'ফসলের নাম খালি হতে পারে না' })
    .refine((val) => ['rice', 'potato', 'onion'].includes(val), {
      message: 'ফসলের নাম অবশ্যই "rice", "potato" অথবা "onion" হতে হবে',
    }),
  fieldArea: z
    .number({
      invalid_type_error: 'জমির ক্ষেত্রফল অবশ্যই একটি সংখ্যা হতে হবে',
      required_error: 'জমির ক্ষেত্রফল প্রয়োজন',
    })
    .nonnegative({ message: 'জমির এলাকা ঋণাত্মক হতে পারে না' }),
  fieldLocation: z.object({
    latitude: z
      .number({
        invalid_type_error: 'অক্ষাংশ অবশ্যই একটি সংখ্যা হতে হবে',
        required_error: 'অক্ষাংশ প্রয়োজন',
      })
      .min(-90, { message: 'অক্ষাংশ -৯০ থেকে ৯০ এর মধ্যে হতে হবে' })
      .max(90, { message: 'অক্ষাংশ -৯০ থেকে ৯০ এর মধ্যে হতে হবে' }),
    longitude: z
      .number({
        invalid_type_error: 'দ্রাঘিমাংশ অবশ্যই একটি সংখ্যা হতে হবে',
        required_error: 'দ্রাঘিমাংশ প্রয়োজন',
      })
      .min(-180, { message: 'দ্রাঘিমাংশ -১৮০ থেকে ১৮০ এর মধ্যে হতে হবে' })
      .max(180, { message: 'দ্রাঘিমাংশ -১৮০ থেকে ১৮০ এর মধ্যে হতে হবে' }),
  }),
});

// Schema for creating a user
const createUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: 'নাম অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'নাম প্রয়োজন',
      })
      .trim()
      .min(1, { message: 'নাম খালি হতে পারে না' }),
    farmerId: z
      .string({
        invalid_type_error: 'কৃষক আইডি অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'কৃষক আইডি প্রয়োজন',
      })
      .trim()
      .min(1, { message: 'কৃষক আইডি খালি হতে পারে না' })
      .regex(/^fr[0-9]+$/, { message: 'কৃষক আইডি অবশ্যই "fr" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে' }),
    email: z
      .string({
        invalid_type_error: 'ইমেল অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'ইমেল প্রয়োজন',
      })
      .email({ message: 'ইমেল ফরম্যাট ঠিক নয়' })
      .trim()
      .toLowerCase(),
    phone: z
      .string({
        invalid_type_error: 'ফোন নম্বর অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'ফোন নম্বর প্রয়োজন',
      })
      .trim()
      .length(11, { message: 'ফোন নম্বর অবশ্যই ঠিক ১১টি সংখ্যার হতে হবে' })
      .regex(/^01[0-9]{9}$/, { message: 'ফোন নম্বর অবশ্যই "01" দিয়ে শুরু হবে এবং ১১ সংখ্যার হতে হবে' }),
    password: z
      .string({
        invalid_type_error: 'পাসওয়ার্ড অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'পাসওয়ার্ড প্রয়োজন',
      })
      .min(6, { message: 'পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে' })
      .max(10, { message: 'পাসওয়ার্ড ১০ অক্ষরের বেশি হতে পারে না' }),
    passwordChangedAt: z
      .date({
        invalid_type_error: 'পাসওয়ার্ড পরিবর্তনের সময় অবশ্যই একটি বৈধ তারিখ হতে হবে',
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: 'ভূমিকা/রোল অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'ভূমিকা/রোল প্রয়োজন',
      })
      .refine((val) => ['admin', 'farmer'].includes(val), {
        message: 'ভূমিকা/রোল অবশ্যই "admin" অথবা "farmer" হতে হবে',
      }),
    status: z
      .string({
        invalid_type_error: 'স্ট্যাটাস অবশ্যই একটি স্ট্রিং হতে হবে',
        required_error: 'স্ট্যাটাস প্রয়োজন',
      })
      .refine((val) => ['blocked', 'active'].includes(val), {
        message: 'স্ট্যাটাস অবশ্যই "blocked" অথবা "active" হতে হবে',
      })
      .default('active'),
    totalFieldsCount: z
      .number({
        invalid_type_error: 'মোট জমির সংখ্যা অবশ্যই একটি সংখ্যা হতে হবে',
        required_error: 'মোট জমির সংখ্যা প্রয়োজন',
      })
      .nonnegative({ message: 'মোট জমির সংখ্যা ঋণাত্মক হতে পারে না' }),
    fieldDetails: z
      .array(fieldDataSchema, {
        required_error: 'জমির বিবরণ প্রয়োজন',
      })
      .refine((val) => val.length >= 0, {
        message: 'জমির বিবরণ অবশ্যই একটি অ্যারে হতে হবে',
      }),
  }),
}).superRefine(({ body: { totalFieldsCount, fieldDetails } }, ctx) => {
  if (fieldDetails.length !== totalFieldsCount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'জমির বিবরণের সংখ্যা অবশ্যই মোট জমির সংখ্যার সাথে মিলতে হবে',
      path: ['fieldDetails'],
    });
  }
});

// Schema for updating a user
const updateUserValidationSchema = z.object({
  body: z.object({
    name: z
      .string({
        invalid_type_error: 'নাম অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .trim()
      .min(1, { message: 'নাম খালি হতে পারে না' })
      .optional(),
    farmerId: z
      .string({
        invalid_type_error: 'কৃষক আইডি অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .trim()
      .min(1, { message: 'কৃষক আইডি খালি হতে পারে না' })
      .regex(/^fr[0-9]+$/, { message: 'কৃষক আইডি অবশ্যই "fr" দিয়ে শুরু হবে এবং তারপরে সংখ্যা থাকবে' })
      .optional(),
    email: z
      .string({
        invalid_type_error: 'ইমেল অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .email({ message: 'ইমেল ফরম্যাট ঠিক নয়' })
      .trim()
      .toLowerCase()
      .optional(),
    phone: z
      .string({
        invalid_type_error: 'ফোন নম্বর অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .trim()
      .length(11, { message: 'ফোন নম্বর অবশ্যই ঠিক ১১টি সংখ্যার হতে হবে' })
      .regex(/^01[0-9]{9}$/, { message: 'ফোন নম্বর অবশ্যই "01" দিয়ে শুরু হবে এবং ১১ সংখ্যার হতে হবে' })
      .optional(),
    password: z
      .string({
        invalid_type_error: 'পাসওয়ার্ড অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .min(6, { message: 'পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে' })
      .max(10, { message: 'পাসওয়ার্ড ১০ অক্ষরের বেশি হতে পারে না' })
      .optional(),
    passwordChangedAt: z
      .date({
        invalid_type_error: 'পাসওয়ার্ড পরিবর্তনের সময় অবশ্যই একটি বৈধ তারিখ হতে হবে',
      })
      .optional(),
    role: z
      .string({
        invalid_type_error: 'ভূমিকা/রোল অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .refine((val) => ['admin', 'farmer'].includes(val), {
        message: 'ভূমিকা/রোল অবশ্যই "admin" অথবা "farmer" হতে হবে',
      })
      .optional(),
    status: z
      .string({
        invalid_type_error: 'স্ট্যাটাস অবশ্যই একটি স্ট্রিং হতে হবে',
      })
      .refine((val) => ['blocked', 'active'].includes(val), {
        message: 'স্ট্যাটাস অবশ্যই "blocked" অথবা "active" হতে হবে',
      })
      .optional(),
    totalFieldsCount: z
      .number({
        invalid_type_error: 'মোট জমির সংখ্যা অবশ্যই একটি সংখ্যা হতে হবে',
      })
      .nonnegative({ message: 'মোট জমির সংখ্যা ঋণাত্মক হতে পারে না' })
      .optional(),
    fieldDetails: z
      .array(fieldDataSchema)
      .optional(),
  }),
}).superRefine(({ body: { totalFieldsCount, fieldDetails } }, ctx) => {
  if (fieldDetails !== undefined && totalFieldsCount !== undefined) {
    if (fieldDetails.length !== totalFieldsCount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'জমির বিবরণের সংখ্যা অবশ্যই মোট জমির সংখ্যার সাথে মিলতে হবে',
        path: ['fieldDetails'],
      });
    }
  }
});

export const UserValidation = {
  createUserValidationSchema,
  updateUserValidationSchema,
};