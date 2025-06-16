import { Page } from '@/components/Page';

import { SettingsPostsClient } from './SettingsPostsClient';

// Optionally, fetch some server data here and pass as props

export default function SettingsPostsPage(/* { params } */) {
  return (
  <Page>
    <SettingsPostsClient /* pass props here if needed */ />;
  </Page>    
  )
}