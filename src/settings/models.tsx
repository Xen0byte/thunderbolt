import { Field as ArkField } from '@ark-ui/solid'
import { createForm, required, reset } from '@modular-forms/solid'

import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { Input } from '@/components/input'
import { useSettings } from '@/components/settings'
import { ModelsSettings } from '@/types'
import { createEffect } from 'solid-js'

export default function ModelsSettingsPage() {
  const { settings, set, get } = useSettings()

  const [formStore, { Form, Field }] = createForm<ModelsSettings>({
    initialValues: settings?.models,
  })

  createEffect(() => {
    if (settings) {
      reset(formStore, {
        initialValues: {
          openai_api_key: '',
          ...settings.models,
        },
      })
    }
  })

  const handleSubmit = async (values: ModelsSettings) => {
    await set('models', values)
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
