import { Field as ArkField } from '@ark-ui/solid'
import { createForm, required } from '@modular-forms/solid'

import { Button } from '@/components/button'
import { Card, CardContent } from '@/components/card'
import { Input } from '@/components/input'
import { useSettings } from '@/settings/provider'
import { AccountsSettings } from '@/types'

export default function AccountsSettingsPage() {
  const { settings, setSettings } = useSettings()

  const [formStore, { Form, Field }] = createForm<AccountsSettings>({
    initialValues: {
      hostname: '',
      port: 3000,
      username: '',
      password: '',
      ...settings.account,
    },
  })

  const handleSubmit = async (values: AccountsSettings) => {
    setSettings({
      ...settings,
      account: values,
    })
  }

  return (
    <>
      <div class="flex flex-col gap-4 p-4 max-w-[800px]">
        <Card>
          <CardContent>
            <Form onSubmit={handleSubmit} class="flex flex-col gap-4">
              <Field name="hostname" validate={[required('Hostname is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Hostname</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {/* <ArkField.HelperText>Some additional Info</ArkField.HelperText> */}
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>
              <Field type="number" name="port" validate={[required('Port is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Port</ArkField.Label>
                      <Input {...props} value={field.value} type="number" />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="username" validate={[required('Username is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Username</ArkField.Label>
                      <Input {...props} value={field.value} />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Field name="password" validate={[required('Password is required.')]}>
                {(field, props) => {
                  return (
                    <ArkField.Root>
                      <ArkField.Label>Password</ArkField.Label>
                      <Input {...props} value={field.value} type="password" />
                      {field.error && <ArkField.ErrorText>{field.error}</ArkField.ErrorText>}
                    </ArkField.Root>
                  )
                }}
              </Field>

              <Button type="submit">Save</Button>
            </Form>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
