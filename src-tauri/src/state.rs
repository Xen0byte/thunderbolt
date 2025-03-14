use assist_imap_client::ImapClient;
use assist_imap_sync::ImapSync;
use libsql::Connection;

#[derive(Default)]
pub struct AppState {
    pub libsql: Option<Connection>,
    pub imap_client: Option<ImapClient>,
    pub imap_sync: Option<ImapSync>,
}
