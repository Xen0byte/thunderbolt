import { Field as ArkField } from '@ark-ui/solid'
import { createForm, required } from '@modular-forms/solid'

import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { Input } from '@/components/input'
import { useSettings } from '@/settings/provider'
import { ModelsSettings } from '@/types'

export default function ModelsSettingsPage() {
  const context = useSettings()

  const [formStore, { Form, Field }] = createForm<ModelsSettings>({
    initialValues: {
      openai_api_key: '',
      ...context.settings.models,
    },
  })

  const handleSubmit = async (values: ModelsSettings) => {
    context.setSettings({
      ...context.settings,
      models: values,
    })
  }

  return (
    <>
      <div class="flex flex-col gap-4 p-4 max-w-[800px]">
        <Card>
          <CardContent>
            <Form onSubmit={handleSubmit} class="flex flex-col gap-4">
              <Field name="openai_api_key" validate={[required('OpenAI API Key is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root class="flex flex-col gap-1.5">
                      <ArkField.Label class="font-medium text-sm">OpenAI API Key</ArkField.Label>
                      <Input {...props} value={field.value} type="password" placeholder="OpenAI API Key" />
                      {field.error && <div class="text-xs text-red-500">{field.error}</div>}
                    </ArkField.Root>
                  )
                }}
              </Field>
              <Button type="submit" class="w-full">
                Save
              </Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
