import { useApi } from "@/api";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import { CenterAligned } from "@/components/CenterAligned";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { BiggerMarginItem, MarginItem } from "@/components/MarginItem";
import { ThemedText } from "@/components/ThemedText";
import { dateTimeDisplay } from "@/dateDisplay";
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import FastImage from "react-native-fast-image";

export default function InviteScreen() {
  const { api, inviteStatus } = useApi();
  const [loading, setLoading] = useState(false);

  if (!inviteStatus || inviteStatus.invitors?.length == 0 || inviteStatus.invited == false) {
    return (
      <View>
        <ThemedText>Invitación no encontrada</ThemedText>
      </View>
    );
  }

  const invitor = inviteStatus.invitors![0];

  const [invitorPfp, setInvitorPfp] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.fetchPfp(invitor.userName).then((result) => {
      if (isMounted) setInvitorPfp(result);
    });
    return () => {
      isMounted = false;
    };
  }, [invitor.userName]);

  const acceptInvite = async () => {
    setLoading(true);
    await api.acceptInvite();
    setLoading(false);
  };
  const declineInvite = async () => {
    setLoading(true);
    await api.declineInvite();
    setLoading(false);
  };

  if (loading) {
    return <FullScreenLoading />;
  }

  const otherUsersLength = inviteStatus.invitors!.length - 1;

  return (
    <View>
      <CenterAligned>
        <MarginItem>
          <ThemedText type="subtitle" style={{ textAlign: 'center' }}>Fuiste invitado por {invitor.name ?? "@" + invitor.userName} {otherUsersLength > 0 ? "y " + otherUsersLength + " mas" : ""}</ThemedText>
        </MarginItem>

        {
          invitorPfp &&
          <MarginItem>
            <FastImage source={{ uri: invitorPfp }} style={{ width: 200, height: 200, borderRadius: 15 }} />
          </MarginItem>
        }

        <MarginItem>
          <ThemedText style={{ textAlign: 'center' }}>{invitor.eventStatus.location?.name} - {dateTimeDisplay(invitor.eventStatus.time!)}</ThemedText>
        </MarginItem>

        <View style={{ width: '100%' }}>
          <BiggerMarginItem>
            <MarginItem>
              <BtnPrimary title="Aceptar" onClick={acceptInvite} />
            </MarginItem>
            <MarginItem>
              <BtnSecondary title="Denegar" onClick={declineInvite} />
            </MarginItem>
          </BiggerMarginItem>
        </View>

      </CenterAligned>
    </View>
  );
}