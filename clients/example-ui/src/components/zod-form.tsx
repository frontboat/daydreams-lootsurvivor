import React from "react";
import { useForm } from "@tanstack/react-form";
// import { zodValidator } from "@tanstack/zod-validator";
import {
  z,
  ZodTypeAny,
  ZodObject,
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodEnum,
  ZodOptional,
  ZodDefault,
} from "zod";

// Helper to get the underlying type if it's Optional or Default
function getBaseZodType(schema: ZodTypeAny): ZodTypeAny {
  if (schema instanceof ZodOptional || schema instanceof ZodDefault) {
    return getBaseZodType(schema._def.innerType);
  }
  return schema;
}

// --- Component Props ---
interface DynamicFormProps<T extends z.AnyZodObject> {
  schema: T;
  onSubmit: (data: z.infer<T>) => void | Promise<void>;
  defaultValues?: Partial<z.infer<T>>;
  renderSubmitButton?: (
    isSubmitting: boolean,
    isValid: boolean
  ) => React.ReactNode;
  fieldRenderOverrides?: Partial<
    Record<keyof T["shape"], (fieldApi: any) => React.ReactNode>
  >; // Allow custom rendering for specific fields
  style?: React.CSSProperties;
  className?: string;
}

// --- The Dynamic Form Component ---
export function DynamicForm<T extends z.AnyZodObject>({
  schema,
  onSubmit,
  defaultValues,
  renderSubmitButton,
  fieldRenderOverrides = {},
  style,
  className,
}: DynamicFormProps<T>) {
  const form = useForm({
    validators: {
      // onSubmit: zodValidator,
    },
    // validatorAdapter: zodValidator, // Integrate Zod
    defaultValues: defaultValues ?? {},
    onSubmit: async ({ value }) => {
      // Zod schema validation happens automatically via the adapter
      await onSubmit(value as z.infer<ZodObject<T>>); // Type assertion is safe here due to validation
    },
  });

  const fieldEntries = Object.entries(schema.shape as T);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      style={style}
      className={className}
    >
      {fieldEntries.map(([name, fieldSchema]) => {
        const fieldName = name as keyof T & string; // Type assertion for safety

        // --- Check for custom field rendering override ---
        if (fieldRenderOverrides[fieldName]) {
          return (
            <form.Field
              key={fieldName}
              name={fieldName}
              // We don't pass validators here; the schema handles it at the form level
            >
              {(fieldApi) => (
                <div className="form-field-container">
                  {fieldRenderOverrides[fieldName]!(fieldApi)}
                </div>
              )}
            </form.Field>
          );
        }

        // --- Default Dynamic Field Rendering ---
        return (
          <form.Field
            key={fieldName}
            name={fieldName}
            // No individual validators needed, schema validator handles it
          >
            {(fieldApi) => {
              // fieldApi contains: { name, state, handleChange, handleBlur, getInputProps, ... }
              const { state, handleChange, handleBlur } = fieldApi;
              const { value } = state;
              const { errors } = state.meta;
              const isTouched = state.meta.isTouched;
              const baseSchema = getBaseZodType(fieldSchema); // Get Zod type without Optional/Default wrappers

              let inputType: React.HTMLInputTypeAttribute = "text"; // Default
              let inputElement: React.ReactNode = null;

              // --- Determine Input Type based on Zod Type ---
              if (baseSchema instanceof ZodNumber) {
                inputType = "number";
                inputElement = (
                  <input
                    id={fieldName}
                    name={fieldName}
                    type={inputType}
                    value={value ?? ""}
                    onBlur={handleBlur}
                    onChange={(e) => handleChange(e.target.valueAsNumber)} // Use valueAsNumber
                    aria-invalid={errors.length > 0}
                    required={!fieldSchema.isOptional()} // Basic required indication
                  />
                );
              } else if (baseSchema instanceof ZodBoolean) {
                inputType = "checkbox";
                inputElement = (
                  <input
                    id={fieldName}
                    name={fieldName}
                    type={inputType}
                    checked={!!value} // Ensure boolean value
                    onBlur={handleBlur}
                    onChange={(e) => handleChange(e.target.checked)} // Use checked
                    aria-invalid={errors.length > 0}
                  />
                );
              } else if (baseSchema instanceof ZodEnum) {
                // Assuming ZodEnum for select dropdown
                const options = (baseSchema._def as any).values as string[]; // Extract enum values
                inputElement = (
                  <select
                    id={fieldName}
                    name={fieldName}
                    value={value ?? ""}
                    onBlur={handleBlur}
                    onChange={(e) => handleChange(e.target.value)}
                    aria-invalid={errors.length > 0}
                    required={!fieldSchema.isOptional()}
                  >
                    <option value="" disabled>
                      -- Select --
                    </option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                );
              } else if (baseSchema instanceof ZodString) {
                // Could add more logic here based on string format (e.g., .email()) if needed
                if (
                  baseSchema._def.checks?.some(
                    (check) => check.kind === "email"
                  )
                ) {
                  inputType = "email";
                }
                // Add more checks (url, uuid, etc.) if desired

                inputElement = (
                  <input
                    id={fieldName}
                    name={fieldName}
                    type={inputType}
                    value={value ?? ""}
                    onBlur={handleBlur}
                    onChange={(e) => handleChange(e.target.value)}
                    aria-invalid={errors.length > 0}
                    required={!fieldSchema.isOptional()}
                  />
                );
              }
              // Add more type handlers here (ZodDate -> date input, etc.) as needed

              // Default fallback if type is not handled
              if (!inputElement) {
                inputElement = (
                  <input
                    id={fieldName}
                    name={fieldName}
                    type="text"
                    value={value ?? ""}
                    onBlur={handleBlur}
                    onChange={(e) => handleChange(e.target.value)}
                    aria-invalid={errors.length > 0}
                    required={!fieldSchema.isOptional()}
                    placeholder={`Unhandled type: ${baseSchema.constructor.name}`}
                  />
                );
              }

              // --- Render Field Label, Input, and Errors ---
              return (
                <div
                  className="form-field-container"
                  style={{ marginBottom: "15px" }}
                >
                  <label
                    htmlFor={fieldName}
                    style={{
                      display: "block",
                      marginBottom: "5px",
                      textTransform: "capitalize",
                    }}
                  >
                    {fieldName.replace(/([A-Z])/g, " $1").trim()}{" "}
                    {/* Simple label generation */}
                    {!fieldSchema.isOptional() && (
                      <span style={{ color: "red" }}> *</span>
                    )}
                  </label>
                  {inputElement}
                  {isTouched && errors.length > 0 && (
                    <div
                      role="alert"
                      style={{
                        color: "red",
                        fontSize: "0.8em",
                        marginTop: "3px",
                      }}
                    >
                      {errors.join(", ")}
                    </div>
                  )}
                </div>
              );
            }}
          </form.Field>
        );
      })}

      {/* --- Submit Button Area --- */}
      <form.Subscribe selector={(state) => [state.isSubmitting, state.isValid]}>
        {([isSubmitting, isValid]) =>
          renderSubmitButton ? (
            renderSubmitButton(isSubmitting, isValid)
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              style={{ marginTop: "10px", padding: "8px 15px" }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          )
        }
      </form.Subscribe>

      {/* Optional: Display general form errors */}
      {/* <form.Subscribe selector={(state) => [state.errors]}>
         {([errors]) =>
           errors.length ? (
             <div style={{ color: 'red', marginTop: '10px' }}>
               Form Errors: {errors.join(', ')}
             </div>
           ) : null
         }
       </form.Subscribe> */}
    </form>
  );
}

// // --- Example Usage ---

// // 1. Define your Zod Schema
// const userSchema = z.object({
//   firstName: z.string().min(1, "First name is required"),
//   lastName: z.string().optional(),
//   email: z.string().email("Invalid email address").min(1, "Email is required"),
//   age: z.number().min(18, "Must be 18 or older").optional().default(0), // Optional with default
//   isAdmin: z.boolean().default(false),
//   role: z.enum(["user", "admin", "guest"]).default("guest"),
//   // Add more fields as needed (e.g., password, confirmPassword with refine)
// });

// // 2. Type for the form data
// type UserFormData = z.infer<typeof userSchema>;

// // 3. Your App or Parent Component
// function App() {
//   const handleFormSubmit = (data: UserFormData) => {
//     console.log("Form Submitted Successfully:", data);
//     // Simulate API call
//     new Promise((resolve) => setTimeout(resolve, 1000));
//     return;
//   };

//   const customRenderAgeField = (fieldApi: any) => {
//     // Example of overriding a specific field's render logic
//     const { state, handleChange, handleBlur } = fieldApi;
//     return (
//       <div>
//         <label htmlFor="age">Your Age (Custom Render):</label>
//         <input
//           id="age"
//           name="age"
//           type="number"
//           value={state.value ?? ""}
//           onChange={(e) => handleChange(e.target.valueAsNumber)}
//           onBlur={handleBlur}
//           style={{ border: "2px solid blue" }}
//         />
//         {state.meta.touched && state.meta.errors.length > 0 && (
//           <em style={{ color: "darkorange" }}>
//             {state.meta.errors.join(", ")}
//           </em>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div style={{ padding: "20px", maxWidth: "500px", margin: "auto" }}>
//       <h1>Dynamic User Form</h1>
//       <DynamicForm // Pass the shape type
//         schema={userSchema}
//         onSubmit={handleFormSubmit}
//         defaultValues={
//           {
//             // Optional: Prefill some values (must match schema types)
//             // firstName: 'Test',
//           }
//         }
//         // Example: Provide a custom submit button render prop
//         renderSubmitButton={(isSubmitting, isValid) => (
//           <button
//             type="submit"
//             disabled={isSubmitting || !isValid}
//             style={{
//               backgroundColor: isValid ? "green" : "grey",
//               color: "white",
//               padding: "10px 20px",
//               border: "none",
//               borderRadius: "5px",
//             }}
//           >
//             {isSubmitting ? "Saving..." : "Create User"}
//           </button>
//         )}
//         // Example: Override rendering for the 'age' field
//         fieldRenderOverrides={{
//           age: customRenderAgeField,
//         }}
//         className="my-dynamic-form"
//       />
//     </div>
//   );
// }

// export default App;
