import { useApi } from "@/api";
import { BtnPrimary, BtnSecondary } from "@/components/Buttons";
import { CenterAligned } from "@/components/CenterAligned";
import { FullScreenLoading } from "@/components/FullScreenLoading";
import { BiggerMarginItem, MarginItem } from "@/components/MarginItem";
import { ThemedText } from "@/components/ThemedText";
import { dateTimeDisplay } from "@/dateDisplay";
import { useEffect, useState } from "react";
import { View, Image } from "react-native";

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

  useEffect(() => {
    const inner = async () => {
      inviteStatus.invitors?.forEach(async (invitor) => {
        await api.fetchPfp(invitor.userName);
      });
    };
    inner();
  }, [inviteStatus]);

  const invitor = inviteStatus.invitors![0];

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

        <MarginItem>
          <Image source={{ uri: api.getPfpUnstable(invitor.userName) }} style={{ width: 200, height: 200, borderRadius: 15 }} />
        </MarginItem>

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