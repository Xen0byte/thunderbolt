import { getDrizzleDatabase } from '@/db/singleton'
import { settingsTable } from '@/db/tables'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const getForecast = {
  name: 'weather.getForecast',
  description: 'Get the weather forecast.',
  verb: 'Checking the weather',
  parameters: z.object({
    // location: z.string().describe('The location to get the weather forecast for.').optional(),
  }),
  execute: async () => {
    const { db } = await getDrizzleDatabase()

    try {
      let url = 'https://api.open-meteo.com/v1/forecast?hourly=temperature_2m,precipitation,cloud_cover'

      // Get location from settings if available
      const locationLat = await db.select().from(settingsTable).where(eq(settingsTable.key, 'location_lat')).get()
      const locationLng = await db.select().from(settingsTable).where(eq(settingsTable.key, 'location_lng')).get()

      if (locationLat && locationLng) {
        url = `${url}&latitude=${locationLat}&longitude=${locationLng}`
      } else {
        // Fallback to default coordinates if no settings found
        url = `${url}&latitude=52.52&longitude=13.41`
      }

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Weather API returned ${response.status}: ${response.statusText}`)
      }

      console.log('response', response)

      const forecast = await response.json()

      console.log('forecast', forecast)
      return forecast
    } catch (error) {
      console.error('Error fetching weather forecast:', error)
      throw new Error('Failed to get weather forecast')
    }
  },
}
