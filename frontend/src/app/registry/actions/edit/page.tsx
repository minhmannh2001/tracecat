"use client"

import React from "react"
import { useSearchParams } from "next/navigation"
import {
  RegistryActionUpdate,
  TemplateAction_Output,
  TemplateActionDefinition,
} from "@/client"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeftIcon, Loader2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import YAML from "yaml"
import { z } from "zod"

import { useRegistryAction, useRegistryActions } from "@/lib/hooks"
import { isTemplateAction } from "@/lib/registry"
import { itemOrEmptyString } from "@/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomEditor } from "@/components/editor"
import { CenteredSpinner } from "@/components/loading/spinner"

export default function EditActionPage() {
  const searchParams = useSearchParams()
  const version = searchParams.get("version")
  const actionName = searchParams.get("template")

  if (!actionName || !version) {
    return <div>No template action name or version provided</div>
  }

  return (
    <div className="size-full overflow-auto">
      <div className="container flex h-full max-w-[1000px] flex-col space-y-12 p-16">
        <div className="flex w-full">
          <div className="items-start space-y-3 text-left">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink
                    href="/registry/actions"
                    className="flex items-center"
                  >
                    <ArrowLeftIcon className="mr-2 size-4" />
                    Registry
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>{"/"}</BreadcrumbSeparator>
                <BreadcrumbItem>
                  <BreadcrumbLink>Edit Action</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <h2 className="text-2xl font-semibold tracking-tight">
              Edit Registry Action
            </h2>
            <p className="text-md text-muted-foreground">
              Edit the action template to customize the action.
            </p>
          </div>
        </div>
        <EditTemplateActionView actionName={actionName} version={version} />
      </div>
    </div>
  )
}

function EditTemplateActionView({
  actionName,
  version,
}: {
  actionName: string
  version: string
}) {
  const { registryAction, registryActionIsLoading, registryActionError } =
    useRegistryAction(actionName, version)

  if (registryActionIsLoading || !registryAction) {
    return <CenteredSpinner />
  }

  if (registryActionError) {
    return <div>Error: {registryActionError.message}</div>
  }

  if (!isTemplateAction(registryAction.implementation)) {
    return <div>Error: Action is not a template</div>
  }

  return (
    <EditTemplateActionForm
      actionName={actionName}
      version={version}
      baseTemplateAction={registryAction.implementation.template_action}
    />
  )
}

const editTemplateActionFormSchema = z.object({
  origin: z.string(),
  definition: z.string(),
})

type EditTemplateActionFormSchema = z.infer<typeof editTemplateActionFormSchema>

function EditTemplateActionForm({
  actionName,
  version,
  baseTemplateAction,
}: {
  actionName: string
  version: string
  baseTemplateAction: TemplateAction_Output
}) {
  const {
    updateRegistryAction,
    updateRegistryActionIsPending,
    updateRegistryActionError,
  } = useRegistryActions()

  const methods = useForm<EditTemplateActionFormSchema>({
    resolver: zodResolver(editTemplateActionFormSchema),
    defaultValues: {
      origin: `${version}/${actionName}`,
      definition: itemOrEmptyString(baseTemplateAction.definition),
    },
  })

  const onSubmit = async (data: EditTemplateActionFormSchema) => {
    console.log("Form submitted:", data)
    try {
      const defn = YAML.parse(data.definition) as TemplateActionDefinition
      const updateParams = {
        name: defn.name,
        description: defn.description,
        default_title: defn.title,
        display_group: defn.display_group,
        secrets: defn.secrets,
        interface: {
          expects: defn.expects,
          returns: defn.returns,
        },
        implementation: {
          type: "template",
          template_action: {
            definition: defn,
          },
        },
      } as RegistryActionUpdate
      await updateRegistryAction({
        actionName,
        version,
        requestBody: updateParams,
      })
    } catch (error) {
      console.error("Error updating template action:", error)
      // Consider adding a toast notification here for user feedback
    }
  }

  if (updateRegistryActionError) {
    return <div>Error: {updateRegistryActionError.message}</div>
  }
  if (updateRegistryActionIsPending) {
    return <CenteredSpinner />
  }

  return (
    <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
      <div className="space-y-4">
        <Controller
          name="origin"
          control={methods.control}
          render={({ field }) => (
            <div className="flex flex-col space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                disabled
                id="version"
                placeholder="Enter version"
                className="font-mono"
                {...field}
              />
            </div>
          )}
        />

        <div className="flex flex-col space-y-4">
          <Controller
            name="definition"
            control={methods.control}
            render={({ field }) => (
              <div className="flex flex-col space-y-2">
                <Label htmlFor="definition">Definition</Label>
                <span className="text-xs text-muted-foreground">
                  Edit the action template in YAML. Changes will be reflected in
                  workflows immediately.
                </span>
                <CustomEditor
                  className="h-96 w-full"
                  defaultLanguage="yaml"
                  value={field.value}
                  onChange={field.onChange}
                />
              </div>
            )}
          />
        </div>
      </div>

      <Button type="submit" disabled={updateRegistryActionIsPending}>
        {updateRegistryActionIsPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Creating...
          </>
        ) : (
          "Update Action"
        )}
      </Button>
    </form>
  )
}