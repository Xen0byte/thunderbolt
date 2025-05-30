import { Resource } from '@modelcontextprotocol/sdk/types.js';
import { BaseResourceProvider } from './base.js';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  attendees?: string[];
  organizer?: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurrence?: string;
}

interface Calendar {
  id: string;
  name: string;
  color: string;
  type: 'personal' | 'work' | 'shared';
  eventCount: number;
}

export class CalendarResourceProvider extends BaseResourceProvider {
  protected prefix = 'calendar';
  
  async listResources(): Promise<Resource[]> {
    return [
      {
        uri: this.createUri('calendars'),
        name: 'All Calendars',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('events/today'),
        name: "Today's Events",
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('events/week'),
        name: 'This Week Events',
        mimeType: 'application/json'
      },
      {
        uri: this.createUri('events/month'),
        name: 'This Month Events',
        mimeType: 'application/json'
      }
    ];
  }
  
  async readResource(uri: string): Promise<{
    contents: Array<{
      uri: string;
      mimeType: string;
      text?: string;
    }>;
  }> {
    const path = this.parseUri(uri);
    
    if (path === 'calendars') {
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(await this.getCalendars(), null, 2)
        }]
      };
    }
    
    if (path.startsWith('events/')) {
      const timeframe = path.substring('events/'.length);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(await this.getEvents(timeframe), null, 2)
        }]
      };
    }
    
    if (path.startsWith('event/')) {
      const eventId = path.substring('event/'.length);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(await this.getEvent(eventId), null, 2)
        }]
      };
    }
    
    if (path.startsWith('calendar/')) {
      const calendarId = path.substring('calendar/'.length);
      return {
        contents: [{
          uri,
          mimeType: 'application/json',
          text: JSON.stringify(await this.getCalendarEvents(calendarId), null, 2)
        }]
      };
    }
    
    throw new Error(`Unknown calendar resource: ${uri}`);
  }
  
  private async getCalendars(): Promise<Calendar[]> {
    // Mock implementation
    return [
      {
        id: 'personal',
        name: 'Personal Calendar',
        color: '#0099ff',
        type: 'personal',
        eventCount: 15
      },
      {
        id: 'work',
        name: 'Work Calendar',
        color: '#ff6600',
        type: 'work',
        eventCount: 42
      },
      {
        id: 'shared',
        name: 'Team Calendar',
        color: '#00cc66',
        type: 'shared',
        eventCount: 8
      }
    ];
  }
  
  private async getEvents(timeframe: string): Promise<CalendarEvent[]> {
    const now = new Date();
    const events: CalendarEvent[] = [];
    
    // Mock implementation based on timeframe
    switch (timeframe) {
      case 'today':
        events.push({
          id: 'evt1',
          title: 'Team Standup',
          description: 'Daily team sync',
          start: new Date(now.setHours(9, 0, 0, 0)).toISOString(),
          end: new Date(now.setHours(9, 30, 0, 0)).toISOString(),
          location: 'Conference Room A',
          attendees: ['team@company.com'],
          status: 'confirmed',
          recurrence: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR'
        });
        break;
        
      case 'week':
        events.push({
          id: 'evt2',
          title: 'Project Review',
          description: 'Weekly project status review',
          start: new Date(now.setDate(now.getDate() + 2)).toISOString(),
          end: new Date(now.setHours(now.getHours() + 1)).toISOString(),
          organizer: 'manager@company.com',
          attendees: ['team@company.com', 'stakeholder@company.com'],
          status: 'confirmed'
        });
        break;
        
      case 'month':
        events.push({
          id: 'evt3',
          title: 'Monthly All-Hands',
          description: 'Company-wide meeting',
          start: new Date(now.setDate(15)).toISOString(),
          end: new Date(now.setHours(now.getHours() + 2)).toISOString(),
          location: 'Main Auditorium',
          organizer: 'ceo@company.com',
          attendees: ['all@company.com'],
          status: 'confirmed'
        });
        break;
    }
    
    return events;
  }
  
  private async getEvent(id: string): Promise<CalendarEvent | null> {
    // Mock implementation - would fetch from actual calendar
    const allEvents = [
      ...await this.getEvents('today'),
      ...await this.getEvents('week'),
      ...await this.getEvents('month')
    ];
    
    return allEvents.find(e => e.id === id) || null;
  }
  
  private async getCalendarEvents(calendarId: string): Promise<CalendarEvent[]> {
    // Mock implementation - return events for specific calendar
    if (calendarId === 'work') {
      return await this.getEvents('week');
    }
    
    return await this.getEvents('today');
  }
}